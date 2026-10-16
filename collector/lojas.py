"""Extração por loja. Sem dados de produto e identidade, resultado não verificado."""
import json
import re
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse, urlunparse


def identify_store(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port:
        return None
    host = (parsed.hostname or '').lower()
    path = parsed.path
    if host in ('amazon.com.br', 'www.amazon.com.br'):
        match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})(?:/|$)', path, re.I)
        if match:
            return {'name':'amazon','host':'www.amazon.com.br','id':match[1].upper(),
                    'url':'https://www.amazon.com.br/dp/'+match[1].upper()}
    if host in ('kabum.com.br','www.kabum.com.br'):
        match = re.match(r'/produto/(\d+)(?:/|$)', path)
        if match:
            return {'name':'kabum','host':host,'id':match[1], 'url':urlunparse(parsed._replace(fragment=''))}
    if host in ('mercadolivre.com.br','www.mercadolivre.com.br','produto.mercadolivre.com.br'):
        match = re.search(r'\b(MLB[U]?[-]?\d+)\b', path, re.I)
        if match:
            return {'name':'mercadolivre','host':host,'id':match[1].replace('-','').upper(),
                    'url':urlunparse(parsed._replace(fragment=''))}
    if host in ('shopee.com.br','www.shopee.com.br'):
        match = re.search(r'/(?:product|opaanlp)/(\d+)/(\d+)(?:/|$)', path) or re.search(r'-i\.(\d+)\.(\d+)(?:/|$)',path)
        if match:
            return {'name':'shopee','host':host,'id':match[2],'shop_id':match[1],
                    'url':urlunparse(parsed._replace(fragment=''))}
    # Links encurtados não são resolvidos automaticamente.
    return None


class StructuredParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.current = None
        self.parts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script':
            self.current = attrs
            self.parts = []

    def handle_data(self, data):
        if self.current is not None:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.current is not None:
            if self.current.get('type') == 'application/ld+json' or self.current.get('id') == '__NEXT_DATA__':
                try:
                    self.scripts.append((self.current, json.loads(''.join(self.parts))))
                except (ValueError,TypeError):
                    pass
            self.current = None


class TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts=[]
        self.skip=0
    def handle_starttag(self,t,a):
        if t in ('style','script'): self.skip+=1
    def handle_endtag(self,t):
        if t in ('style','script'): self.skip=max(0,self.skip-1)
    def handle_data(self,s):
        if not self.skip: self.parts.append(s)


def text(value):
    parser=TextParser()
    parser.feed(str(value or ''))
    return ' '.join(' '.join(parser.parts).split())


def products(value, depth=0):
    if depth > 8:
        return []
    if isinstance(value,list):
        return [p for item in value for p in products(item,depth+1)]
    if not isinstance(value,dict):
        return []
    types=value.get('@type',[])
    types=[types] if isinstance(types,str) else types
    if 'Product' in types:
        return [value]
    return [p for key in ('@graph','mainEntity') for p in products(value.get(key),depth+1)]


def id_matches(product, store):
    # Apenas identificadores/URLs do próprio produto; nunca nome ou produtos recomendados.
    values=[product.get(k) for k in ('url','@id','sku','productID')]
    expected=store['id'].upper()
    for value in values:
        if not isinstance(value,(str,int)):
            continue
        candidate=str(value).upper().replace('MLB-','MLB')
        if candidate==expected:
            return True
        if re.search(r'(?<![A-Z0-9])'+re.escape(expected)+r'(?![A-Z0-9])',candidate):
            return True
    return False


def inspect_store(html,store):
    from verificar_midia import inspect_amazon, inspect_sections
    if store['name']=='amazon':
        result=inspect_amazon(html,store['id'])
        result['extraction_method']='amazon_product_sections'
        return result
    parser=StructuredParser()
    parser.feed(html)
    sections={}
    title=None
    identity=False
    method=None
    if store['name']=='kabum':
        for attrs,payload in parser.scripts:
            if attrs.get('id')=='__NEXT_DATA__':
                product=payload.get('props',{}).get('pageProps',{}).get('product',{})
                if str(product.get('id'))==store['id'] and product.get('title'):
                    identity=True
                    title=product['title']
                    technical=product.get('technicalInformation') or {}
                    sections={'productDescription':text(product.get('description')),
                              'technicalInformation':text(technical.get('text')) if isinstance(technical,dict) else ''}
                    method='kabum_next_product'
                    break
    if not identity:
        for attrs,payload in parser.scripts:
            if attrs.get('type')!='application/ld+json':
                continue
            matching=[p for p in products(payload) if id_matches(p,store) and p.get('name')]
            if len(matching)!=1:
                continue
            product=matching[0]
            identity=True
            title=product['name']
            properties=product.get('additionalProperty') or []
            if isinstance(properties,dict):properties=[properties]
            specs=' '.join(str(p.get('name',''))+': '+str(p.get('value','')) for p in properties if isinstance(p,dict))
            sections={'productDescription':text(product.get('description')),'technicalInformation':text(specs)}
            method='jsonld_product'
            break
    result=inspect_sections(sections,identity,title)
    result['extraction_method']=method
    result['review_required']=result['result']=='unverified'
    if not identity:
        result['notes'].append('Dados estruturados do produto ausentes, identidade incompatível ou página exige JavaScript/acesso.')
    return result
