#!/usr/bin/env python3
"""Fila SQLite de entregas para a função ingest-offers do Garimplay."""
import argparse
import hashlib
import json
import os
import sqlite3
import sys
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def open_queue(path):
    path.parent.mkdir(parents=True,exist_ok=True)
    connection=sqlite3.connect(path,timeout=30)
    connection.execute('''create table if not exists deliveries(
        revision text primary key, payload text not null, status text not null default 'pending',
        attempts integer not null default 0, last_error text,
        enqueued_at text not null default current_timestamp, delivered_at text)''')
    connection.commit()
    return connection


def enqueue(connection, report, verification=None):
    checks={}
    if verification is not None:
        if verification.get('input_report') != report['_input_file']:
            raise ValueError('Verificação pertence a outro relatório de coleta.')
        checks={r['external_id']:r['verification'] for r in verification['results']}
    candidates=report.get('candidates_for_review')
    if not isinstance(candidates,list):raise ValueError('Relatório sem lista de candidatos.')
    payloads=[]
    for candidate in candidates:
        offer=dict(candidate)
        if offer.get('source')!='pelando' or offer.get('source_status')!='active':
            raise ValueError('Somente ofertas ativas do Pelando são aceitas.')
        offer['collected_at']=offer.get('collected_at') or report['collected_at']
        if offer['external_id'] in checks:
            check=checks[offer['external_id']]
            # Exclusão explícita não deve entrar na caixa; falhas/pendências continuam para revisão.
            if check.get('result')=='excluded_digital_without_packaging':continue
            offer['verification']=check
        payload=json.dumps(offer,ensure_ascii=False,sort_keys=True,separators=(',',':'))
        revision=hashlib.sha256(payload.encode()).hexdigest()
        payloads.append((revision,payload))
    with connection:
        for revision,payload in payloads:
            connection.execute('insert or ignore into deliveries(revision,payload) values (?,?)',(revision,payload))
    return len(payloads)


def post_batch(endpoint,secret,offers):
    request=Request(endpoint,data=json.dumps({'offers':offers},ensure_ascii=False).encode(),method='POST',
        headers={'Content-Type':'application/json','x-ingest-key':secret})
    # Não segue redirecionamento que possa transmitir a credencial a outro destino.
    with build_opener(NoRedirect()).open(request,timeout=30) as response:
        return json.loads(response.read(1_000_001))


def drain(connection,endpoint,secret,post=post_batch):
    delivered=0
    # Uma tentativa por revisão por execução; pendências são retomadas na próxima chamada.
    rows=connection.execute("select revision,payload from deliveries where status='pending' order by enqueued_at,revision").fetchall()
    for revision,payload in rows:
        offer=json.loads(payload)
        try:
            result=post(endpoint,secret,[offer])
            expected=(offer['source'],offer['external_id'],offer['collected_at'])
            accepted=result.get('accepted',[]) if isinstance(result,dict) else []
            if expected not in [(a.get('source'),a.get('external_id'),a.get('collected_at')) for a in accepted if isinstance(a,dict)]:
                raise ValueError('Resposta sem confirmação da oferta enviada.')
            with connection:
                connection.execute("update deliveries set status='delivered',attempts=attempts+1,last_error=null,delivered_at=current_timestamp where revision=?",(revision,))
            delivered+=1
        except (OSError,ValueError,TypeError) as exc:
            # Nunca registra token nem corpo de erro remoto.
            with connection:
                connection.execute('update deliveries set attempts=attempts+1,last_error=? where revision=?',
                    (type(exc).__name__,revision))
            # Evita insistir sobre as demais ofertas após erro de conexão/autenticação/serviço.
            break
    pending=connection.execute("select count(*) from deliveries where status='pending'").fetchone()[0]
    return {'delivered':delivered,'pending':pending}


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--input',type=Path,help='Relatório do coletor; opcional para reenviar a fila.')
    cli.add_argument('--verification',type=Path,help='Relatório de verificar_midia.py correspondente.')
    cli.add_argument('--queue',type=Path,required=True)
    cli.add_argument('--queue-only',action='store_true',help='Somente adicionar à fila, sem rede.')
    args=cli.parse_args()
    if args.verification and not args.input:cli.error('--verification exige --input.')
    connection=open_queue(args.queue)
    try:
        if args.input:
            report=json.loads(args.input.read_text())
            report['_input_file']=args.input.name
            checks=json.loads(args.verification.read_text()) if args.verification else None
            enqueue(connection,report,checks)
        if args.queue_only:
            print(json.dumps({'pending':connection.execute("select count(*) from deliveries where status='pending'").fetchone()[0]}));return
        endpoint=os.environ.get('GARIMPLAY_INGEST_URL','')
        secret=os.environ.get('GARIMPLAY_INGEST_SECRET','')
        url=urlparse(endpoint)
        if url.scheme!='https' or not url.hostname or url.username or url.password or url.port or len(secret)<32:
            raise ValueError('Configure GARIMPLAY_INGEST_URL (HTTPS) e GARIMPLAY_INGEST_SECRET (32+ caracteres). Fila preservada.')
        result=drain(connection,endpoint,secret)
        print(json.dumps(result))
        if result['pending']:sys.exit(1)
    finally:connection.close()


if __name__=='__main__':
    try:main()
    except (OSError,ValueError,KeyError,TypeError,sqlite3.Error) as exc:
        print('Falha no envio: '+str(exc),file=sys.stderr);sys.exit(1)
