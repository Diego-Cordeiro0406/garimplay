import tempfile
import unittest
from pathlib import Path
from enviar_importacoes import open_queue,enqueue,drain

class SenderTests(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory()
        self.connection=open_queue(Path(self.directory.name)/'queue.sqlite')
        self.report={'_input_file':'report.json','collected_at':'2026-01-01T10:00:00Z',
            'candidates_for_review':[{'source':'pelando','external_id':'1','source_status':'active','title':'Jogo PS5'}]}
    def tearDown(self):
        self.connection.close();self.directory.cleanup()
    def test_replay_and_receipt(self):
        enqueue(self.connection,self.report);enqueue(self.connection,self.report)
        self.assertEqual(self.connection.execute('select count(*) from deliveries').fetchone()[0],1)
        def post(url,key,offers):return {'accepted':[{k:offers[0][k] for k in ('source','external_id','collected_at')}]}
        self.assertEqual(drain(self.connection,'https://example.test','secret',post),{'delivered':1,'pending':0})
        enqueue(self.connection,self.report)
        self.assertEqual(drain(self.connection,'https://example.test','secret',post)['delivered'],0)
    def test_failure_and_missing_confirmation_remain_pending(self):
        enqueue(self.connection,self.report)
        def failed(*args):raise OSError('network unavailable')
        self.assertEqual(drain(self.connection,'https://example.test','secret',failed)['pending'],1)
        self.assertEqual(drain(self.connection,'https://example.test','secret',lambda *a:{'ok':True})['pending'],1)
        self.assertEqual(self.connection.execute('select attempts from deliveries').fetchone()[0],2)
    def test_verification_mismatch_and_digital_exclusion(self):
        with self.assertRaises(ValueError):enqueue(self.connection,self.report,{'input_report':'wrong.json','results':[]})
        checks={'input_report':'report.json','results':[{'external_id':'1','verification':{'result':'excluded_digital_without_packaging'}}]}
        self.assertEqual(enqueue(self.connection,self.report,checks),0)
    def test_boxed_and_pending_are_kept(self):
        checks={'input_report':'report.json','results':[{'external_id':'1','verification':{'result':'boxed_code_in_store'}}]}
        self.assertEqual(enqueue(self.connection,self.report,checks),1)

if __name__=='__main__':unittest.main()
