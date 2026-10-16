import copy
import json
import unittest
from pathlib import Path
from coletor import classify, collect, normalize, parse_feed

class CollectorTests(unittest.TestCase):
    def test_classification(self):
        self.assertEqual(classify('Controle DualSense PS5')[1], ['ps5'])
        self.assertEqual(classify('Jogo Nintendo Switch 2')[1], ['switch-2'])
        self.assertEqual(classify('Mouse sem fio')[0], 'accessory_review')
        self.assertEqual(classify('Camiseta Adidas')[0], 'unrelated')

    def test_prices(self):
        base = {'id': 'a', 'slug': 'a', 'title': 'Jogo', 'price': 70.19}
        self.assertEqual(normalize(base)['price_cents'], 7019)
        base['price'] = None
        self.assertIsNone(normalize(base)['price_cents'])
        base['price'] = 0
        self.assertEqual(normalize(base)['price_cents'], 0)
        base['price'] = -1
        with self.assertRaises(ValueError): normalize(base)

    def test_fail_closed(self):
        with self.assertRaises(ValueError): parse_feed('<html>Site indisponível</html>')

    def test_history_and_updates(self):
        # Reconstrói um pequeno feed Astro para validar a mudança de preço e status.
        def pair(v):
            if isinstance(v, dict): return [0, {k: pair(x) for k, x in v.items()}]
            if isinstance(v, list): return [1, [pair(x) for x in v]]
            return [0, v]
        def html(deal):
            from html import escape
            return '<astro-island props="' + escape(json.dumps({'initialDeals': pair([deal])}), quote=True) + '"></astro-island>'
        deal = {'id': 'a', 'slug': 'a', 'title': 'Jogo PS5', 'price': 100,
                'status': 'active', 'kind': 'promotion', 'firstApprovedAt': '2026-10-16T10:00:00Z'}
        report, state = collect(html(deal), {})
        self.assertEqual(len(report['candidates_for_review']), 1)
        report, _ = collect(html(deal), state)
        self.assertEqual(report['summary']['changes'], {'unchanged': 1})
        self.assertEqual(report['candidates_for_review'], [])
        deal['price'] = 90
        report, state = collect(html(deal), state)
        self.assertEqual(report['offers'][0]['change'], 'updated')
        deal['status'] = 'expired'
        report, _ = collect(html(deal), state)
        self.assertEqual(report['offers'][0]['change'], 'updated')
        self.assertEqual(report['candidates_for_review'], [])

if __name__ == '__main__': unittest.main()
