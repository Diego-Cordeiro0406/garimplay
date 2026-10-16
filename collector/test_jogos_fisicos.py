import unittest
from coletor import normalize
from jogos_fisicos import physical_classification, report_deals


def raw(title, url='https://loja.exemplo.com/produto/123', kind='promotion'):
    return {'id': '123', 'slug': 'jogo', 'title': title, 'price': 100, 'sourceUrl': url,
            'kind': kind, 'status': 'active', 'firstApprovedAt': '2026-10-16T10:00:00Z'}


class PhysicalTests(unittest.TestCase):
    def category(self, title, **kwargs):
        return physical_classification(normalize(raw(title, **kwargs)))[0]

    def test_positive_and_uncertain(self):
        self.assertEqual(self.category('Jogo Elden Ring PS5 mídia física'), 'physical_confirmed')
        self.assertEqual(self.category('Elden Ring PS5'), 'physical_likely')
        self.assertEqual(self.category('Jogo em promoção'), 'uncertain')
        self.assertEqual(self.category('Elden Ring PS5', url='https://loja.exemplo.com/'), 'uncertain')

    def test_boxed_code(self):
        self.assertEqual(self.category('Jogo PS5 CODE IN BOX código para download'), 'physical_likely')
        self.assertEqual(self.category('Jogo PS5 caixa física'), 'physical_likely')

    def test_digital(self):
        for title in ['Jogo PS5 digital', 'Jogo grátis na Epic', 'Jogo Android', 'Jogo Steam', 'Jogo Game Pass']:
            self.assertEqual(self.category(title), 'excluded')
        self.assertEqual(self.category('Jogo PS5', url='https://store.epicgames.com/p/jogo'), 'excluded')
        self.assertEqual(self.category('Jogo PS5 mídia física com código digital'), 'uncertain')

    def test_hardware_and_coupons(self):
        for title in ['Controle PS5', 'Console Nintendo Switch 2', 'PS5 1 TB', 'Capa jogo PS5', 'Mouse gamer']:
            self.assertEqual(self.category(title), 'excluded')
        self.assertEqual(self.category('Cupom jogo PS5', kind='coupon'), 'excluded')

    def test_history_duplicates_and_expired(self):
        deal = raw('Jogo PS5')
        report, state = report_deals([deal, deal], {}, {})
        self.assertEqual(report['summary']['total'], 1)
        self.assertEqual(len(report['candidates_for_review']), 1)
        report, state = report_deals([deal], state, {})
        self.assertEqual(report['summary']['changes'], {'unchanged': 1})
        self.assertEqual(report['candidates_for_review'], [])
        deal['status'] = 'expired'
        report, _ = report_deals([deal], state, {})
        self.assertEqual(report['offers'][0]['change'], 'updated')
        self.assertEqual(report['candidates_for_review'], [])

if __name__ == '__main__': unittest.main()
