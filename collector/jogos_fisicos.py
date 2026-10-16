#!/usr/bin/env python3
"""Seleciona candidatos a jogos físicos no feed de destaques da página inicial."""
import argparse
import hashlib
import json
import re
import sys
import time
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from coletor import normalize, plain, atomic_json

ENDPOINT = 'https://api-web.pelando.com.br/feed/highlights'
PHYSICAL = r'\b(?:midia fisica|versao fisica|edicao fisica|disco|cartucho|physical|blu[ -]?ray)\b'
DIGITAL = r'\b(?:digital|digitais|download|code in box|sem disco|key|chave|codigo|gift\s*card|steam|epic(?: games)?|android|ios|prime gaming|game\s*pass|assinatura|dlc|trial|teste gratis|teste gratuito|conta primaria|conta secundaria|resgate)\b'
HARDWARE = r'\b(?:bundle|console|consoles|controle|controles|dualsense|dualshock|headset|suporte|capa|pelicula|carregador|volante|amiibo|case|estojo|fone|dock|cartao de memoria)\b'
HARDWARE_PREFIX = r'^(?:\[[^\]]+\]\s*)?(?:sony\s+|nintendo\s+)?(?:playstation\s*5|ps5|playstation\s*4|ps4|xbox\s+series|switch\s*(?:2|oled|lite))\s+(?:console|\d+\s*(?:gb|tb))\b'


def physical_classification(offer):
    title = plain(offer['title'])
    platforms = offer['platform_suggestions']
    physical = bool(re.search(PHYSICAL, title))
    digital_hosts = {'store.steampowered.com', 'store.epicgames.com', 'play.google.com', 'apps.apple.com', 'luna.amazon.com'}
    digital = bool(re.search(DIGITAL, title)) or urlparse(offer.get('product_url') or '').hostname in digital_hosts
    game = bool(re.search(r'\b(?:jogos?|games?)\b', title)) or bool(platforms)
    reasons = []
    if offer['kind'] != 'promotion':
        return 'excluded', ['Cupom ou outro tipo de publicação.']
    if re.search(HARDWARE, title) or re.search(HARDWARE_PREFIX, title):
        return 'excluded', ['Sinal de console ou acessório no título; regra conservadora.']
    if not game:
        return 'excluded', ['Sem indicação suficiente de jogo ou plataforma.']
    boxed = bool(re.search(r'\b(?:code in box|codigo na caixa|codigo dentro da caixa|capa fisica|embalagem fisica|caixa fisica)\b', title))
    if boxed:
        return 'physical_likely', ['Embalagem física indicada no título; aceita inclusive código para download. Confirmar na loja.']
    if digital:
        if physical:
            return 'uncertain', ['Título mistura sinais de mídia física e digital.']
        return 'excluded', ['Sinal de conteúdo digital, assinatura ou teste.']
    if physical:
        return 'physical_confirmed', ['Indicação explícita de mídia física no título; não verificada na loja.']
    url = offer.get('product_url') or ''
    parsed = urlparse(url)
    # Uma página inicial de loja não basta para sugerir produto físico.
    product_link = parsed.scheme == 'https' and bool(parsed.hostname) and parsed.path not in ('', '/')
    if platforms and product_link:
        return 'physical_likely', ['Plataforma e link de produto, sem sinais digitais; confirmar formato na loja.']
    return 'uncertain', ['Informações insuficientes para sugerir mídia física.']


def report_deals(deals, state, metadata):
    known = dict(state.get('offers', {}))
    offers = []
    seen = set()
    for raw in deals:
        offer = normalize(raw)
        identity = offer['external_id']
        if identity in seen:
            continue
        seen.add(identity)
        category, reasons = physical_classification(offer)
        offer['physical_media'] = category
        offer['physical_media_reasons'] = reasons
        digest = hashlib.sha256(json.dumps(offer, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        previous = known.get(identity)
        offer['change'] = 'new' if previous is None else ('unchanged' if previous == digest else 'updated')
        known[identity] = digest
        offers.append(offer)
    selected = [o for o in offers if o['physical_media'] in ('physical_confirmed', 'physical_likely')
                and o['source_status'] == 'active' and o['approved_at'] and o['change'] != 'unchanged']
    report = {'collected_at': datetime.now(timezone.utc).isoformat(),
              'feed_url': 'https://www.pelando.com.br/', 'collection': metadata,
              'classification_basis': 'title_and_source_url; no_store_verification',
              'summary': {'total': len(offers), 'changes': dict(Counter(o['change'] for o in offers)),
                          'physical_media': dict(Counter(o['physical_media'] for o in offers)),
                          'selected_for_review': len(selected)},
              'candidates_for_review': selected,
              'uncertain_for_review': [o for o in offers if o['physical_media'] == 'uncertain'],
              'offers': offers}
    return report, {'version': 2, 'offers': known}


def fetch_highlights(pages, visitor_id):
    deals, cursor, cursors, page_info = [], None, set(), None
    responses = []
    for number in range(pages):
        params = {'scenario': 'Main-Feed', 'limit': 10}
        if cursor:
            params['after'] = cursor
        url = ENDPOINT + '?' + urlencode(params)
        request = Request(url, headers={'User-Agent': 'GarimplayCollectionPrototype/0.2',
            'Accept': 'application/json', 'Referer': 'https://www.pelando.com.br/',
            'x-sosho-unlogged-id': visitor_id})
        with urlopen(request, timeout=25) as response:
            body = response.read(6_000_001)
            if len(body) > 6_000_000:
                raise ValueError('Resposta excede o limite.')
            payload = json.loads(body)
        data = payload.get('data', {})
        batch = data.get('deals')
        if not isinstance(batch, list) or not batch:
            raise ValueError('Feed vazio ou incompatível; histórico preservado.')
        deals.extend(batch)
        responses.append(payload)
        page_info = data.get('pageInfo', {})
        if not page_info.get('hasNextPage'):
            break
        cursor = page_info.get('endCursor')
        if not cursor or cursor in cursors:
            raise ValueError('Cursor de paginação ausente ou repetido.')
        cursors.add(cursor)
        if number + 1 < pages:
            time.sleep(1)
    return deals, {'pages_fetched': len(responses), 'last_page_info': page_info,
                   'has_more': bool(page_info.get('hasNextPage')), 'input': 'live_http'}, responses


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--pages', type=int, default=5)
    cli.add_argument('--input-json', type=Path, help='Resposta salva da API de destaques (modo offline).')
    cli.add_argument('--output', type=Path, required=True)
    cli.add_argument('--state', type=Path, required=True)
    args = cli.parse_args()
    if not 1 <= args.pages <= 10:
        cli.error('Use entre 1 e 10 páginas por execução.')
    if args.output.exists() or args.output.resolve() == args.state.resolve():
        cli.error('Escolha uma saída nova e diferente do histórico.')
    state = json.loads(args.state.read_text()) if args.state.exists() else {'version': 2, 'offers': {}}
    if state.get('version') != 2 or not isinstance(state.get('offers'), dict):
        raise ValueError('Use um histórico separado para o coletor de jogos físicos.')
    visitor_id = state.get('visitor_id') or str(uuid.uuid4())
    if args.input_json:
        payload = json.loads(args.input_json.read_text())
        deals = payload['data']['deals']
        if not deals:
            raise ValueError('Feed vazio.')
        metadata = {'input': 'saved_json', 'pages_fetched': 1, 'last_page_info': payload['data'].get('pageInfo')}
    else:
        deals, metadata, _ = fetch_highlights(args.pages, visitor_id)
    report, next_state = report_deals(deals, state, metadata)
    next_state['visitor_id'] = visitor_id
    atomic_json(args.output, report)
    atomic_json(args.state, next_state)
    print(json.dumps(report['summary'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f'Falha na coleta: {exc}', file=sys.stderr)
        sys.exit(1)
