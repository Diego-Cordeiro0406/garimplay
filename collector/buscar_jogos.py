#!/usr/bin/env python3
"""Busca jogos no Pelando: ofertas ativas aprovadas dentro de uma janela móvel."""
import argparse
import hashlib
import json
import sys
import time
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from coletor import atomic_json, normalize
from jogos_fisicos import physical_classification

ENDPOINT = 'https://api-web.pelando.com.br/feed/v2/search'
DEFAULT_QUERIES = ['jogo PS5', 'jogo PS4', 'jogo Switch', 'jogo Xbox', 'mídia física']


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError('Data ausente.')
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('Data sem fuso horário.')
    return result.astimezone(timezone.utc)


def request_page(params, visitor_id):
    request = Request(ENDPOINT + '?' + urlencode(params), headers={
        'User-Agent': 'GarimplayCollectionPrototype/0.3', 'Accept': 'application/json',
        'Referer': 'https://www.pelando.com.br/', 'x-sosho-unlogged-id': visitor_id})
    with urlopen(request, timeout=25) as response:
        body = response.read(6_000_001)
        if len(body) > 6_000_000:
            raise ValueError('Resposta excedeu o tamanho esperado.')
        return json.loads(body)


def fetch_searches(queries, max_pages, visitor_id, fetch=request_page, pause=1):
    pages, metadata = [], []
    for query in queries:
        cursor, cursors, count, exhausted = None, set(), 0, False
        for number in range(max_pages):
            params = {'term': query, 'sortOption': 'createdAt', 'hideExpired': 'true', 'limit': 20}
            if cursor:
                params['after'] = cursor
            payload = fetch(params, visitor_id)
            data = payload.get('data') if isinstance(payload, dict) else None
            if not isinstance(data, dict) or not isinstance(data.get('deals'), list):
                raise ValueError('Resposta da busca incompatível; histórico preservado.')
            info = data.get('pageInfo')
            if not isinstance(info, dict) or not isinstance(info.get('hasNextPage'), bool):
                raise ValueError('Informações de paginação ausentes ou incompatíveis.')
            batch = data['deals']
            if not batch and info['hasNextPage']:
                raise ValueError('Página vazia indica próxima página; revisar paginação.')
            pages.append({'query': query, 'page': number + 1, 'payload': payload})
            count += len(batch)
            if not info['hasNextPage']:
                exhausted = True
                break
            cursor = info.get('endCursor')
            if not isinstance(cursor, str) or not cursor or cursor in cursors:
                raise ValueError('Cursor ausente ou repetido; histórico preservado.')
            cursors.add(cursor)
            if pause:
                time.sleep(pause)
        metadata.append({'query': query, 'pages_fetched': number + 1, 'rows_received': count,
                         'stop_reason': 'exhausted' if exhausted else 'page_limit',
                         'potentially_incomplete': not exhausted})
    return {'schema_version': 1, 'pages': pages, 'searches': metadata}


def build_report(capture, state, now, hours):
    if now.tzinfo is None:
        raise ValueError('Horário de referência sem fuso.')
    now = now.astimezone(timezone.utc)
    cutoff = now - timedelta(hours=hours)
    offers_by_id, terms, received = {}, {}, 0
    for page in capture['pages']:
        query = page['query']
        for raw in page['payload']['data']['deals']:
            received += 1
            identity = raw.get('id')
            if not isinstance(identity, str) or not identity:
                raise ValueError('Oferta sem ID; histórico preservado.')
            terms.setdefault(identity, set()).add(query)
            previous = offers_by_id.get(identity)
            # Prefere a revisão mais recente se duas buscas retornarem versões diferentes.
            def revision(offer):
                try:
                    return timestamp(offer.get('updatedAt'))
                except (ValueError, TypeError):
                    return datetime.min.replace(tzinfo=timezone.utc)
            if previous is None or revision(raw) > revision(previous):
                offers_by_id[identity] = raw
    known = dict(state.get('offers', {}))
    offers, discarded = [], Counter()
    for identity, raw in offers_by_id.items():
        try:
            approved = timestamp(raw.get('firstApprovedAt'))
        except (ValueError, TypeError):
            discarded['missing_or_invalid_approval'] += 1
            continue
        if approved < cutoff:
            discarded['older_than_window'] += 1
            continue
        if approved > now:
            discarded['future_approval'] += 1
            continue
        if raw.get('status') != 'active':
            discarded['not_active'] += 1
            continue
        offer = normalize(raw)
        category, reasons = physical_classification(offer)
        offer['physical_media'], offer['physical_media_reasons'] = category, reasons
        # Metadados de busca e horário não alteram a identidade do conteúdo.
        digest = hashlib.sha256(json.dumps(offer,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
        previous = known.get(identity)
        offer['change'] = 'new' if previous is None else ('unchanged' if previous == digest else 'updated')
        known[identity] = digest
        offer['found_by_queries'] = sorted(terms[identity])
        offer['collected_at'] = now.isoformat()
        offer['store_verification'] = {'result': 'pending', 'reason': 'Execute verificar_midia.py; falha de acesso mantém revisão pendente.'}
        offers.append(offer)
    offers.sort(key=lambda offer: (timestamp(offer['approved_at']),offer['external_id']), reverse=True)
    candidates = [o for o in offers if o['physical_media'] in ('physical_confirmed', 'physical_likely') and o['change'] != 'unchanged']
    report = {'schema_version': 3, 'source': 'pelando_search', 'collected_at': now.isoformat(),
        'window': {'hours': hours, 'start_inclusive': cutoff.isoformat(), 'end_inclusive': now.isoformat(), 'field': 'firstApprovedAt'},
        'search_settings': {'sortOption': 'createdAt', 'hideExpired': True},
        'searches': capture['searches'],
        'coverage_warning': 'Limite por busca pode deixar resultados de fora. Não se interrompe por data: ordenação createdAt e corte firstApprovedAt são campos distintos.',
        'summary': {'rows_received': received, 'unique_ids_received': len(offers_by_id),
            'duplicate_occurrences': received-len(offers_by_id), 'active_in_window': len(offers),
            'discarded': dict(discarded), 'changes': dict(Counter(o['change'] for o in offers)),
            'physical_media': dict(Counter(o['physical_media'] for o in offers)),
            'selected_for_review': len(candidates),
            'searches_at_page_limit': sum(s['potentially_incomplete'] for s in capture['searches'])},
        'candidates_for_review': candidates,
        'uncertain_for_review': [o for o in offers if o['physical_media']=='uncertain'], 'offers': offers}
    return report, {'version': 3, 'offers': known}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--query', action='append', help='Repetível; substitui as pesquisas padrão.')
    cli.add_argument('--hours', type=int, default=24)
    cli.add_argument('--pages-per-query', type=int, default=3)
    cli.add_argument('--state', type=Path, required=True)
    cli.add_argument('--output', type=Path, required=True)
    cli.add_argument('--capture', type=Path, help='Salvar respostas para validação offline.')
    cli.add_argument('--input-json', type=Path, help='Captura salva; sem acesso à rede.')
    cli.add_argument('--now', help='Horário ISO com fuso; permitido somente no modo offline.')
    args = cli.parse_args()
    queries = list(dict.fromkeys(q.strip() for q in (args.query or DEFAULT_QUERIES) if q.strip()))
    if not queries or len(queries)>10 or not 1<=args.pages_per_query<=10 or not 1<=args.hours<=168:
        cli.error('Use 1–10 buscas, 1–10 páginas por busca e 1–168 horas.')
    if args.now and not args.input_json:
        cli.error('--now somente com --input-json.')
    paths = [args.output, args.state] + ([args.capture] if args.capture else []) + ([args.input_json] if args.input_json else [])
    if len({p.resolve() for p in paths}) != len(paths):
        cli.error('Entrada, saída, histórico e captura devem ter caminhos diferentes.')
    if args.output.exists() or (args.capture and args.capture.exists()):
        cli.error('Saída e captura devem ser arquivos novos.')
    state = json.loads(args.state.read_text()) if args.state.exists() else {'version':3,'offers':{}}
    if state.get('version')!=3 or not isinstance(state.get('offers'),dict):
        raise ValueError('Use histórico separado para o coletor por buscas.')
    visitor = state.get('visitor_id') or str(uuid.uuid4())
    # A janela usa o início da execução; novas publicações durante a consulta entram na próxima.
    now = timestamp(args.now) if args.now else datetime.now(timezone.utc)
    capture = json.loads(args.input_json.read_text()) if args.input_json else fetch_searches(queries,args.pages_per_query,visitor)
    report, next_state = build_report(capture,state,now,args.hours)
    report['input_mode'] = 'saved_json' if args.input_json else 'live_http'
    next_state['visitor_id'] = visitor
    if args.capture:
        atomic_json(args.capture,capture)
    atomic_json(args.output,report)
    atomic_json(args.state,next_state)
    print(json.dumps(report['summary'],ensure_ascii=False,indent=2))


if __name__=='__main__':
    try:
        main()
    except (OSError,ValueError,TypeError,KeyError) as exc:
        print(f'Falha na busca: {exc}',file=sys.stderr)
        sys.exit(1)
