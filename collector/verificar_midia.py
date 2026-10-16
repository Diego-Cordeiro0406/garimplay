#!/usr/bin/env python3
"""Verifica candidatos na página do Pelando e em descrições da Amazon, KaBuM, Mercado Livre e Shopee."""
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, urljoin
from urllib.request import Request, build_opener, HTTPRedirectHandler
from coletor import plain, atomic_json

SECTIONS = {'productTitle', 'feature-bullets', 'productDescription', 'availability',
            'detailBullets_feature_div', 'productDetails_detailBullets_sections1'}
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}


class ProductParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.sections = [], {}

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, dict(attrs).get('id')))

    def handle_endtag(self, tag):
        for index in range(len(self.stack)-1, -1, -1):
            if self.stack[index][0] == tag:
                self.stack = self.stack[:index]
                break

    def handle_data(self, text):
        if any(tag in ('script', 'style') for tag, _ in self.stack):
            return
        for identity in {identity for _, identity in self.stack if identity in SECTIONS}:
            self.sections.setdefault(identity, []).append(text)

    def texts(self):
        return {key: ' '.join(' '.join(value).split()) for key, value in self.sections.items()}


def unpack(value):
    if isinstance(value, list) and len(value) == 1 and value[0] == 0:
        return None
    if not isinstance(value, list) or len(value) != 2:
        raise ValueError('Serialização de detalhes incompatível.')
    tag, data = value
    if tag == 0:
        return {k: unpack(v) for k, v in data.items()} if isinstance(data, dict) else data
    if tag == 1 and isinstance(data, list):
        return [unpack(v) for v in data]
    raise ValueError('Serialização de detalhes não suportada.')


class DetailParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.deal = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'astro-island' and 'props' in attrs:
            props = json.loads(attrs['props'])
            if 'deal' in props:
                candidate = unpack(props['deal'])
                if isinstance(candidate, dict) and candidate.get('id'):
                    self.deal = candidate


PACKAGING = [r'\bcode\s+in\s+box\b', r'\bcodigo\s+(?:para\s+baixar\s+)?(?:dentro da|na)\s+caixa\b',
             r'\b(?:capa|embalagem|caixa)\s+fisica\b']
NO_PACKAGING = r'\b(?:sem|nao inclui|nao acompanha)\s+(?:uma\s+)?(?:caixa|capa|embalagem)(?:\s+fisica)?\b'
NEGATIVE = [r'\bcodigo\s+para\s+(?:baixar|download)\b', r'\b(?:sem|nao e|nao inclui|nao contem)\s+midia fisica\b', r'\bcode\s+in\s+box\b', r'\bsem\s+(?:disco|cartucho)\b',
            r'nao\s+(?:havera|ha|inclui|contem)\s+(?:um\s+)?(?:disco|cartucho)',
            r'(?:somente|apenas)\s+(?:um\s+)?codigo\s+para\s+(?:baixar|download)',
            r'\b(?:midia digital|versao digital|download code)\b']
POSITIVE = [r'\b(?:midia fisica|versao fisica|edicao fisica)\b',
            r'\bdisco do jogo\b', r'\b(?:inclui|contem|acompanha)\s+(?:um\s+)?(?:disco|cartucho)\b',
            r'\b(?:formato|tipo de midia)\s*:\s*(?:disco|cartucho|blu[ -]?ray|fisico|fisica)\b']


def inspect_amazon(html, expected_asin):
    parser = ProductParser()
    parser.feed(html)
    sections = parser.texts()
    # Título e ASIN precisam corresponder à oferta, sem usar produtos recomendados.
    product_title = sections.get('productTitle', '')
    details = sections.get('detailBullets_feature_div', '') + ' ' + sections.get('productDetails_detailBullets_sections1', '')
    identity_ok = bool(product_title and expected_asin.upper() in details.upper())
    return inspect_sections(sections, identity_ok, product_title)


def inspect_sections(sections, identity_ok, product_title):
    evidence = []
    for section in ('feature-bullets', 'productDescription', 'technicalInformation'):
        text = sections.get(section, '')
        normalized = plain(text)
        for label, patterns in [('digital_or_code_in_box', NEGATIVE), ('physical', POSITIVE), ('physical_packaging', PACKAGING)]:
            for pattern in patterns:
                match = re.search(pattern, normalized)
                if match:
                    evidence.append({'section': section, 'signal': label,
                        'excerpt': text[max(0,match.start()-70):min(len(text),match.end()+170)]})
                    break
    negative = any(e['signal'] == 'digital_or_code_in_box' for e in evidence)
    positive = any(e['signal'] == 'physical' for e in evidence)
    packaging = any(e['signal'] == 'physical_packaging' for e in evidence)
    no_packaging = any(re.search(NO_PACKAGING, plain(sections.get(k, ''))) for k in ('feature-bullets', 'productDescription', 'technicalInformation'))
    # Código em caixa é elegível quando a embalagem está declarada; conflitos exigem revisão.
    result = 'unverified'
    if identity_ok and packaging and not no_packaging:
        result = 'boxed_code_in_store' if negative else 'physical_packaging_in_store'
    elif identity_ok and packaging and no_packaging:
        result = 'unverified'
    elif identity_ok and (negative or no_packaging):
        result = 'excluded_digital_without_packaging'
    elif identity_ok and positive:
        result = 'physical_explicit_in_store'
    return {'result': result, 'identity_checked': identity_ok, 'store_title': product_title or None,
            'evidence': evidence, 'preorder_signal': bool(re.search(r'pre[- ]?(?:venda|carregamento)|\breserve\b',
                plain(' '.join(sections.get(k, '') for k in ('availability','feature-bullets','productDescription','technicalInformation'))))),
            'price_verified': False,
            'packaging_declared': packaging and not no_packaging,
            'game_delivery': 'download_code' if result == 'boxed_code_in_store' else ('physical_media_declared' if result == 'physical_explicit_in_store' else 'unspecified'),
            'notes': ['Preço, cupons, estoque e data de entrega não confirmados.']}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def read_public(url, host):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != host or parsed.username or parsed.password or parsed.port:
        raise ValueError('URL fora do domínio permitido.')
    # Não segue redirecionamentos para destinos externos fornecidos por ofertas.
    with build_opener(NoRedirect()).open(Request(url, headers={'User-Agent':'Mozilla/5.0',
            'Accept':'text/html', 'Accept-Language':'pt-BR,pt;q=0.9'}), timeout=25) as response:
        content_type = response.headers.get('Content-Type','').strip()
        if content_type and 'text/html' not in content_type:
            raise ValueError('Resposta não é HTML.')
        body = response.read(6_000_001)
        if len(body) > 6_000_000:
            raise ValueError('Resposta grande demais.')
        html = body.decode('utf-8',errors='replace')
        if not re.match(r'\s*(?:<!doctype\s+html|<html)\b', html, re.I):
            raise ValueError('Documento HTML não reconhecido.')
        return html


def verify_candidate(offer, detail_html=None, store_html=None):
    verification = {'checked_at': datetime.now(timezone.utc).isoformat(),
                    'source_url': offer['source_url'], 'product_url': offer.get('product_url'),
                    'result': 'unverified', 'evidence': [], 'errors': []}
    try:
        detail_html = detail_html if detail_html is not None else read_public(offer['source_url'], 'www.pelando.com.br')
        parser = DetailParser()
        parser.feed(detail_html)
        deal = parser.deal
        if not deal or deal.get('id') != offer['external_id']:
            raise ValueError('Detalhe ausente ou ID divergente.')
        verification['pelando'] = {'id': deal['id'], 'title': deal.get('title'), 'status': deal.get('status'),
            'short_description_html': deal.get('shortDescription'), 'description_html': deal.get('description'),
            'price': deal.get('price')}
    except (OSError, ValueError, TypeError) as exc:
        verification['errors'].append('Pelando: ' + str(exc))
    url = offer.get('product_url') or ''
    parsed = urlparse(url)
    from lojas import identify_store, inspect_store
    store = identify_store(url)
    if store is None:
        verification['errors'].append('Loja ou URL não suportada; revisar manualmente.')
        return verification
    verification['store'] = store['name']
    verification['store_checked_url'] = store['url']
    try:
        store_html = store_html if store_html is not None else read_public(store['url'], store['host'])
        verification.update(inspect_store(store_html, store))
    except (OSError, ValueError, TypeError, KeyError) as exc:
        verification['errors'].append('Loja: ' + str(exc))
        verification['review_required'] = True
    return verification


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--input', type=Path, required=True, help='Relatório de jogos_fisicos.py')
    cli.add_argument('--output', type=Path, required=True)
    cli.add_argument('--limit', type=int, default=3)
    cli.add_argument('--detail-html', type=Path, help='HTML salvo; somente para relatório de um candidato.')
    cli.add_argument('--store-html', type=Path, help='HTML salvo; somente para relatório de um candidato.')
    args = cli.parse_args()
    if args.output.exists() or args.output.resolve() == args.input.resolve():
        cli.error('Escolha uma saída nova.')
    if not 1 <= args.limit <= 10:
        cli.error('Limite deve ser entre 1 e 10.')
    report = json.loads(args.input.read_text())
    candidates = report['candidates_for_review']
    if (args.detail_html or args.store_html) and len(candidates) != 1:
        cli.error('Fixtures HTML exigem exatamente um candidato.')
    results = []
    for offer in candidates[:args.limit]:
        verification = verify_candidate(offer,
            args.detail_html.read_text() if args.detail_html else None,
            args.store_html.read_text() if args.store_html else None)
        results.append({'external_id': offer['external_id'], 'title': offer['title'], 'verification': verification})
    payload = {'checked_at': datetime.now(timezone.utc).isoformat(), 'input_report': args.input.name,
        'input_mode': 'saved_html' if args.detail_html or args.store_html else 'live_http',
        'total_candidates': len(candidates), 'checked': len(results),
        'unchecked': len(candidates)-len(results), 'results': results,
        'eligible_after_verification': [r['external_id'] for r in results
            if r['verification']['result'] in ('physical_explicit_in_store', 'boxed_code_in_store', 'physical_packaging_in_store')
            and not r['verification']['errors'] and r['verification'].get('pelando',{}).get('status')=='active']}
    atomic_json(args.output, payload)
    print(json.dumps(payload,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    try:
        main()
    except (OSError,ValueError,KeyError,TypeError) as exc:
        print(f'Falha na verificação: {exc}',file=sys.stderr)
        sys.exit(1)
