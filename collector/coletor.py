#!/usr/bin/env python3
"""Coleta pontual de ofertas públicas; usa somente a biblioteca padrão do Python."""
import argparse
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

URL = 'https://www.pelando.com.br/recentes'


def decode(value):
    if not isinstance(value, list) or len(value) != 2:
        raise ValueError('Serialização do feed mudou: par esperado.')
    tag, data = value
    if tag == 0:
        return {k: decode(v) for k, v in data.items()} if isinstance(data, dict) else data
    if tag == 1 and isinstance(data, list):
        return [decode(v) for v in data]
    raise ValueError(f'Serialização do feed não suportada: {tag!r}.')


class FeedParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.deals = None
        self.page_info = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'astro-island' and 'props' in attrs:
            props = json.loads(attrs['props'])
            if 'initialDeals' in props:
                self.deals = decode(props['initialDeals'])
                self.page_info = decode(props['initialPageInfo']) if 'initialPageInfo' in props else None


def parse_feed(html):
    parser = FeedParser()
    parser.feed(html)
    if not isinstance(parser.deals, list) or not parser.deals:
        raise ValueError('Feed ausente ou vazio. Histórico preservado; confira o site antes de repetir.')
    return parser.deals, parser.page_info


def plain(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text.lower()) if unicodedata.category(c) != 'Mn')


PLATFORMS = {
    'ps5': r'\b(?:ps5|playstation\s*5)\b',
    'ps4': r'\b(?:ps4|playstation\s*4)\b',
    'switch-2': r'\b(?:nintendo\s+)?switch\s*2\b',
    'switch': r'\b(?:nintendo\s+switch|switch\s+(?:oled|lite))\b',
    'xbox-series': r'\bxbox\s+series\b',
    'xbox-one': r'\bxbox\s+one\b',
}
GAMING = r'\b(?:playstation|xbox|nintendo|steam|game\s*pass|dualsense|dualshock|jogos?|games?|gamer|gaming|console|consoles|gamepad|joystick)\b'
ACCESSORIES = r'\b(?:headset|teclado|mouse|monitor|ssd|placa de video|rtx\s*\d+|radeon)\b'


def classify(title):
    title = plain(title)
    platforms = [k for k, pattern in PLATFORMS.items() if re.search(pattern, title)]
    if 'switch-2' in platforms and 'switch' in platforms:
        platforms.remove('switch')
    if platforms:
        return 'gaming', platforms, ['Plataforma mencionada no título; confirmar compatibilidade.']
    if re.search(GAMING, title):
        return 'gaming', [], ['Termo de games no título; revisar relevância e plataforma.']
    if re.search(ACCESSORIES, title):
        return 'accessory_review', [], ['Possível acessório; não implica compatibilidade com console.']
    return 'unrelated', [], []


def normalize(deal):
    for key in ('id', 'title', 'slug'):
        if not isinstance(deal.get(key), str) or not deal[key].strip():
            raise ValueError(f'Oferta inválida: campo {key} ausente.')
    price = deal.get('price')
    cents = None
    if price is not None:
        try:
            amount = Decimal(str(price)) * 100
            if not amount.is_finite() or amount < 0 or amount != amount.to_integral_value():
                raise ValueError('Preço inválido ou com mais de duas casas decimais.')
            cents = int(amount)
            if cents > 2147483647:
                raise ValueError('Preço excede o limite do Garimplay.')
        except InvalidOperation as exc:
            raise ValueError('Preço inválido.') from exc
    category, platforms, reasons = classify(deal['title'])
    return {
        'source': 'pelando', 'external_id': deal['id'], 'title': deal['title'].strip(),
        'price_cents': cents, 'currency': 'BRL',
        'source_url': 'https://www.pelando.com.br/d/' + deal['slug'],
        'product_url': deal.get('sourceUrl'), 'image_url': deal.get('imageUrl'),
        'store': deal.get('store'), 'source_status': deal.get('status'),
        'kind': deal.get('kind'), 'approved_at': deal.get('firstApprovedAt'),
        'classification': category, 'platform_suggestions': platforms, 'review_notes': reasons,
    }


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def collect(html, state):
    deals, page_info = parse_feed(html)
    known = dict(state.get('offers', {}))
    offers, seen = [], set()
    for raw in deals:
        offer = normalize(raw)
        identity = offer['external_id']
        if identity in seen:
            continue
        seen.add(identity)
        digest = hashlib.sha256(json.dumps(offer, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        previous = known.get(identity)
        offer['change'] = 'new' if previous is None else ('unchanged' if previous == digest else 'updated')
        known[identity] = digest
        offers.append(offer)
    candidates = [o for o in offers if o['classification'] in ('gaming', 'accessory_review')
                  and o['source_status'] == 'active' and o['approved_at']
                  and o['change'] != 'unchanged']
    report = {
        'collected_at': datetime.now(timezone.utc).isoformat(), 'feed_url': URL,
        'scope': 'Somente a primeira página; sem garantia de cobertura entre execuções.',
        'page_info': page_info,
        'summary': {'total': len(offers), 'changes': dict(Counter(o['change'] for o in offers)),
                    'kinds': dict(Counter(o['kind'] for o in offers)),
                    'statuses': dict(Counter(o['source_status'] for o in offers)),
                    'classifications': dict(Counter(o['classification'] for o in offers)),
                    'candidates_for_review': len(candidates)},
        'candidates_for_review': candidates, 'offers': offers,
    }
    return report, {'version': 1, 'offers': known}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--html', type=Path, help='Usa HTML salvo, sem acesso à rede.')
    cli.add_argument('--output', type=Path, required=True, help='Novo arquivo JSON por execução.')
    cli.add_argument('--state', type=Path, required=True, help='Histórico local de IDs e conteúdo.')
    args = cli.parse_args()
    if args.output.resolve() == args.state.resolve():
        cli.error('Saída e histórico devem ser arquivos diferentes.')
    if args.output.exists():
        cli.error('A saída já existe. Escolha outro nome para preservar os relatórios anteriores.')
    state = json.loads(args.state.read_text(encoding='utf-8')) if args.state.exists() else {'version': 1, 'offers': {}}
    if state.get('version') != 1 or not isinstance(state.get('offers'), dict):
        raise ValueError('Formato do histórico inválido.')
    if args.html:
        html = args.html.read_text(encoding='utf-8')
    else:
        request = Request(URL, headers={'User-Agent': 'GarimplayCollectionPrototype/0.1', 'Accept': 'text/html'})
        with urlopen(request, timeout=25) as response:
            if 'text/html' not in response.headers.get('Content-Type', ''):
                raise ValueError('O site não retornou HTML.')
            body = response.read(6_000_001)
            if len(body) > 6_000_000:
                raise ValueError('Página excedeu o tamanho esperado.')
            html = body.decode('utf-8')
    report, next_state = collect(html, state)
    report['input'] = 'saved_html' if args.html else 'live_http'
    # Salva o relatório antes do histórico: uma falha não deve ocultar ofertas novas.
    atomic_json(args.output, report)
    atomic_json(args.state, next_state)
    print(json.dumps(report['summary'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError) as exc:
        print(f'Falha na coleta: {exc}', file=sys.stderr)
        sys.exit(1)
