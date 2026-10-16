import unittest
from verificar_midia import inspect_amazon, DetailParser


def page(description, title='Jogo PS5', asin='B012345678'):
    return f'<html><span id="productTitle">{title}</span><div id="detailBullets_feature_div">ASIN: {asin}</div><div id="feature-bullets">{description}</div></html>'


class VerificationTests(unittest.TestCase):
    def test_code_in_box_and_negation(self):
        for description in ['CODE IN BOX. Não haverá um disco na caixa.', 'Código para baixar dentro da caixa.']:
            result = inspect_amazon(page(description), 'B012345678')
            self.assertEqual(result['result'], 'boxed_code_in_store')
            self.assertTrue(result['packaging_declared'])
            self.assertEqual(result['game_delivery'], 'download_code')
        for description in ['Sem disco; somente código para baixar.', 'Não inclui mídia física.']:
            self.assertEqual(inspect_amazon(page(description), 'B012345678')['result'], 'excluded_digital_without_packaging')
        self.assertEqual(inspect_amazon(page('CODE IN BOX. Sem caixa física.'), 'B012345678')['result'], 'unverified')

    def test_positive(self):
        self.assertEqual(inspect_amazon(page('Inclui um cartucho. Versão física.'), 'B012345678')['result'], 'physical_explicit_in_store')

    def test_identity_and_unknown(self):
        self.assertEqual(inspect_amazon(page('Mídia física', asin='B099999999'), 'B012345678')['result'], 'unverified')
        self.assertEqual(inspect_amazon('<html>Captcha</html>', 'B012345678')['result'], 'unverified')
        self.assertEqual(inspect_amazon(page('Grande aventura no PS5'), 'B012345678')['result'], 'unverified')

    def test_ignore_comments_recommendations_and_scripts(self):
        html = page('Grande aventura no PS5') + '<div id="reviews">Mídia física</div><div id="recommendations">Inclui disco</div>'
        self.assertEqual(inspect_amazon(html, 'B012345678')['result'], 'unverified')
        self.assertEqual(inspect_amazon(page('<script>Mídia física</script>'), 'B012345678')['result'], 'unverified')

    def test_preorder(self):
        self.assertTrue(inspect_amazon(page('Reserve na pré-venda. Inclui disco.'), 'B012345678')['preorder_signal'])

if __name__ == '__main__': unittest.main()
