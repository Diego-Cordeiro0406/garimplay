import copy
import unittest
from datetime import datetime, timezone
from buscar_jogos import build_report, fetch_searches

NOW=datetime(2026,10,16,12,tzinfo=timezone.utc)


def offer(identity='a',date='2026-10-16T10:00:00Z',status='active',price=100):
    return {'id':identity,'title':'Jogo Elden Ring PS5','slug':'elden-ring','price':price,
            'sourceUrl':'https://loja.exemplo.com/produto/1','kind':'promotion','status':status,
            'firstApprovedAt':date,'createdAt':date,'updatedAt':'2026-10-16T11:00:00Z'}


def capture(batches):
    return {'pages':[{'query':query,'page':1,'payload':{'data':{'deals':deals}}} for query,deals in batches],
            'searches':[{'query':q,'potentially_incomplete':False} for q,_ in batches]}


class SearchTests(unittest.TestCase):
    def test_dates_status_and_boundaries(self):
        records=[offer('start','2026-10-15T12:00:00Z'),offer('end','2026-10-16T12:00:00Z'),
                 offer('old','2026-10-15T11:59:59Z'),offer('future','2026-10-16T12:00:01Z'),
                 offer('bad','invalid'),offer('nozone','2026-10-16T10:00:00'),offer('expired',status='expired')]
        report,_=build_report(capture([('PS5',records)]),{},NOW,24)
        self.assertEqual({o['external_id'] for o in report['offers']},{'start','end'})
        self.assertEqual(report['summary']['discarded'],{'older_than_window':1,'future_approval':1,
                                                       'missing_or_invalid_approval':2,'not_active':1})

    def test_dedup_and_query_provenance(self):
        report,state=build_report(capture([('PS5',[offer()]),('mídia física',[offer()])]),{},NOW,24)
        self.assertEqual(report['summary']['duplicate_occurrences'],1)
        self.assertEqual(report['offers'][0]['found_by_queries'],['PS5','mídia física'])
        repeated,_=build_report(capture([('outra busca',[offer()])]),state,NOW,24)
        self.assertEqual(repeated['offers'][0]['change'],'unchanged')
        self.assertEqual(repeated['candidates_for_review'],[])
        updated,_=build_report(capture([('PS5',[offer(price=90)])]),state,NOW,24)
        self.assertEqual(updated['offers'][0]['change'],'updated')

    def test_prefer_newer_revision(self):
        older=offer(price=100);older['updatedAt']='2026-10-16T09:00:00Z'
        report,_=build_report(capture([('PS5',[offer(price=90)]),('jogo',[older])]),{},NOW,24)
        self.assertEqual(report['offers'][0]['price_cents'],9000)

    def test_pagination_and_active_request(self):
        calls=[]
        def fetch(params,visitor):
            calls.append(dict(params))
            return {'data':{'deals':[offer(str(len(calls)))],
                'pageInfo':{'hasNextPage':len(calls)==1,'endCursor':'cursor-next'}}}
        result=fetch_searches(['PS5'],3,'visitor',fetch=fetch,pause=0)
        self.assertEqual(len(result['pages']),2)
        self.assertEqual(calls[0]['hideExpired'],'true')
        self.assertEqual(calls[0]['sortOption'],'createdAt')
        self.assertEqual(calls[1]['after'],'cursor-next')
        self.assertFalse(result['searches'][0]['potentially_incomplete'])

    def test_cap_and_no_unsafe_date_stop(self):
        def fetch(params,visitor):
            return {'data':{'deals':[offer(date='2025-01-01T10:00:00Z')],
                'pageInfo':{'hasNextPage':True,'endCursor':'cursor'}}}
        result=fetch_searches(['PS5'],1,'visitor',fetch=fetch,pause=0)
        self.assertTrue(result['searches'][0]['potentially_incomplete'])
        with self.assertRaises(ValueError):fetch_searches(['PS5'],3,'visitor',fetch=fetch,pause=0)

    def test_empty_and_invalid_response(self):
        empty=lambda p,v:{'data':{'deals':[],'pageInfo':{'hasNextPage':False}}}
        result=fetch_searches(['PS5'],3,'visitor',fetch=empty,pause=0)
        self.assertEqual(result['searches'][0]['stop_reason'],'exhausted')
        with self.assertRaises(ValueError):fetch_searches(['PS5'],3,'visitor',fetch=lambda p,v:{'errors':['no']},pause=0)

if __name__=='__main__':unittest.main()
