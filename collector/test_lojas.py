import json
import unittest
from lojas import identify_store, inspect_store
from jogos_fisicos import physical_classification
from coletor import normalize


def jsonld(product):
    return '<html><script type="application/ld+json">'+json.dumps(product)+'</script></html>'

class StoreTests(unittest.TestCase):
    def test_supported_urls_and_rejections(self):
        urls=[('https://www.kabum.com.br/produto/123/jogo','kabum'),
              ('https://www.mercadolivre.com.br/jogo/p/MLB123456','mercadolivre'),
              ('https://produto.mercadolivre.com.br/MLB-123456-jogo-_JM','mercadolivre'),
              ('https://shopee.com.br/product/123/456','shopee'),
              ('https://shopee.com.br/Jogo-i.123.456','shopee')]
        for url,name in urls:self.assertEqual(identify_store(url)['name'],name)
        for url in ['https://s.shopee.com.br/curto','https://www.kabum.com.br.evil.com/produto/123',
                    'http://shopee.com.br/product/123/456','https://user:pass@shopee.com.br/product/123/456']:
            self.assertIsNone(identify_store(url))

    def test_kabum_next_product(self):
        store=identify_store('https://www.kabum.com.br/produto/123/jogo')
        product={'id':123,'title':'Jogo PS5','description':'Aventura',
                 'technicalInformation':{'text':'<p>Conteúdo da Embalagem: Disco do jogo PS5 - 1 unidade</p>'}}
        html='<script id="__NEXT_DATA__" type="application/json">'+json.dumps({'props':{'pageProps':{'product':product}}})+'</script>'
        self.assertEqual(inspect_store(html,store)['result'],'physical_explicit_in_store')
        product['id']=999
        wrong='<script id="__NEXT_DATA__">'+json.dumps({'props':{'pageProps':{'product':product}}})+'</script>'
        self.assertEqual(inspect_store(wrong,store)['result'],'unverified')

    def test_mercadolivre_jsonld(self):
        store=identify_store('https://www.mercadolivre.com.br/jogo/p/MLB123456')
        product={'@type':'Product','url':store['url'],'name':'Jogo PS5',
                 'additionalProperty':[{'name':'Formato','value':'Disco'}]}
        self.assertEqual(inspect_store(jsonld(product),store)['result'],'physical_explicit_in_store')
        product['url']='https://www.mercadolivre.com.br/outro/p/MLB999999'
        self.assertEqual(inspect_store(jsonld(product),store)['result'],'unverified')

    def test_shopee_boxed_and_shell(self):
        store=identify_store('https://shopee.com.br/product/123/456')
        product={'@type':'Product','url':store['url'],'name':'Jogo PS5','description':'CODE IN BOX'}
        self.assertEqual(inspect_store(jsonld(product),store)['result'],'boxed_code_in_store')
        self.assertEqual(inspect_store('<html><script>const app = true;</script></html>',store)['result'],'unverified')

    def test_no_recommended_product_confirmation(self):
        store=identify_store('https://shopee.com.br/product/123/456')
        html=jsonld({'@type':'ItemList','itemListElement':[{'@type':'Product','sku':'456','description':'Mídia física'}]})
        self.assertEqual(inspect_store(html,store)['result'],'unverified')

    def test_real_mercadolivre_capture(self):
        from pathlib import Path
        fixture=json.loads((Path(__file__).parent/'fixtures'/'mercadolivre-produto-real.json').read_text())
        result=inspect_store(jsonld(fixture['product']),identify_store(fixture['source_url']))
        self.assertEqual(result['result'],'physical_explicit_in_store')
        self.assertEqual(result['extraction_method'],'jsonld_product')

    def test_console_bundle_excluded(self):
        offer=normalize({'id':'1','title':'Bundle Nintendo Switch OLED + Super Mario Bros Wonder',
                         'slug':'bundle','price':2000,'kind':'promotion'})
        self.assertEqual(physical_classification(offer)[0],'excluded')

if __name__=='__main__':unittest.main()
