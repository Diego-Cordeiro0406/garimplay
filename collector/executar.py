#!/usr/bin/env python3
"""Um comando para buscar, verificar e importar jogos no Garimplay."""
import argparse
import getpass
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from coletor import atomic_json

BASE = Path(__file__).resolve().parent


def validate_config(config):
    url = urlparse(config.get('url', ''))
    if (url.scheme != 'https' or not url.hostname or url.username or url.password
            or url.port or url.query or url.fragment or not url.path.endswith('/functions/v1/ingest-offers')):
        raise ValueError('Informe a URL HTTPS completa da função ingest-offers.')
    if not isinstance(config.get('secret'), str) or len(config['secret']) < 32:
        raise ValueError('O segredo precisa ter pelo menos 32 caracteres.')
    return config


def save_config(path, config):
    validate_config(config)
    directory_existed = path.parent.exists()
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not directory_existed:
        os.chmod(path.parent, 0o700)
    temporary = path.with_name(path.name + '.tmp')
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, 'w', encoding='utf-8') as stream:
            json.dump(config, stream)
            stream.write('\n')
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def configuration(path, configure=False):
    stored = json.loads(path.read_text()) if path.exists() else {}
    if configure or (not stored and not os.environ.get('GARIMPLAY_INGEST_URL')):
        if not sys.stdin.isatty():
            raise ValueError('Abra um terminal e execute python3 executar.py --configurar uma vez.')
        print('Configuração inicial — os valores serão salvos somente neste computador.')
        url = input('URL HTTPS da função ingest-offers: ').strip()
        secret = getpass.getpass('Segredo da integração (não será exibido): ').strip()
        stored = {'url': url, 'secret': secret}
        save_config(path, stored)
        print('Configuração salva. Não será necessário cadastrá-la nas próximas execuções.')
    if configure:
        return validate_config(stored)
    return validate_config({'url': os.environ.get('GARIMPLAY_INGEST_URL') or stored.get('url', ''),
                            'secret': os.environ.get('GARIMPLAY_INGEST_SECRET') or stored.get('secret', '')})


def invoke(script, arguments, env):
    completed = subprocess.run([sys.executable, str(BASE / script), *map(str, arguments)],
                               env=env, capture_output=True, text=True, check=False)
    if completed.returncode:
        raise RuntimeError(f'{script} não concluiu (código {completed.returncode}). Os arquivos foram preservados.')


def unfinished_run(root):
    if not root.exists():
        return None
    for directory in sorted(root.iterdir()):
        if not directory.is_dir() or not (directory / 'coleta.json').exists():
            continue
        status_path = directory / 'status.json'
        status = json.loads(status_path.read_text()) if status_path.exists() else {}
        if not status.get('enqueued'):
            return directory
    return None


def run_pipeline(run_dir, history, queue, env, hours=24, pages=3, limit=10,
                 queue_only=False, runner=invoke):
    run_dir.mkdir(parents=True, exist_ok=True)
    collect = run_dir / 'coleta.json'
    verification = run_dir / 'verificacao.json'
    status_path = run_dir / 'status.json'
    if not collect.exists():
        print('1/3 Buscando ofertas ativas das últimas horas...', flush=True)
        runner('buscar_jogos.py', ['--hours', hours, '--pages-per-query', pages,
                                  '--output', collect, '--state', history], env)
    else:
        print('1/3 Retomando coleta já salva.', flush=True)
    report = json.loads(collect.read_text())
    count = len(report['candidates_for_review'])
    if not verification.exists():
        if count:
            print(f'2/3 Verificando até {min(count, limit)} de {count} candidatos nas lojas...', flush=True)
            runner('verificar_midia.py', ['--input', collect, '--output', verification, '--limit', limit], env)
        else:
            print('2/3 Nenhum candidato novo para verificar.', flush=True)
            atomic_json(verification, {'input_report': collect.name, 'results': []})
    else:
        print('2/3 Usando verificação já salva.', flush=True)
    print('3/3 Preparando e enviando importações...' if not queue_only else '3/3 Preparando a fila local...', flush=True)
    runner('enviar_importacoes.py', ['--input', collect, '--verification', verification,
                                    '--queue', queue, '--queue-only'], env)
    # A partir daqui a fila é responsável pelas entregas, mesmo se a rede falhar.
    atomic_json(status_path, {'enqueued': True, 'candidates': count})
    if not queue_only:
        runner('enviar_importacoes.py', ['--queue', queue], env)
    atomic_json(status_path, {'enqueued': True, 'candidates': count, 'send_attempt_completed': not queue_only})
    return {'candidates': count, 'reports': str(run_dir)}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--configurar', action='store_true', help='Cadastrar ou trocar a configuração local.')
    cli.add_argument('--config', type=Path, default=BASE / '.garimplay' / 'config.json')
    cli.add_argument('--hours', type=int, default=24)
    cli.add_argument('--pages-per-query', type=int, default=3)
    cli.add_argument('--limit', type=int, default=10)
    cli.add_argument('--queue-only', action='store_true', help='Coletar e preparar fila, sem enviar.')
    cli.add_argument('--retry-only', action='store_true', help='Somente reenviar a fila pendente.')
    args = cli.parse_args()
    if not 1 <= args.hours <= 168 or not 1 <= args.pages_per_query <= 10 or not 1 <= args.limit <= 10:
        cli.error('Use 1–168 horas, 1–10 páginas por busca e 1–10 verificações.')
    if args.queue_only and args.retry_only:
        cli.error('--queue-only e --retry-only são exclusivos.')
    config = configuration(args.config, args.configurar)
    if args.configurar:
        return
    env = {**os.environ, 'GARIMPLAY_INGEST_URL': config['url'], 'GARIMPLAY_INGEST_SECRET': config['secret']}
    # Reutiliza os arquivos criados pelo fluxo manual anterior, quando presentes nesta pasta.
    history, queue = BASE / 'historico-buscas.json', BASE / 'entregas.sqlite'
    if args.retry_only:
        invoke('enviar_importacoes.py', ['--queue', queue], env)
        print('Entregas pendentes enviadas. Nenhuma nova coleta foi feita.')
        return
    runs = BASE / '.garimplay' / 'runs'
    directory = unfinished_run(runs)
    if directory is None:
        directory = runs / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    result = run_pipeline(directory, history, queue, env, hours=args.hours,
                          pages=args.pages_per_query, limit=args.limit, queue_only=args.queue_only)
    print(f"Concluído: {result['candidates']} candidatos nesta coleta. " +
          ('Fila salva; envio não executado.' if args.queue_only else 'Envios pendentes confirmados pelo Garimplay.'))
    print('Relatórios: ' + result['reports'])


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, RuntimeError) as exc:
        print('Não foi possível concluir: ' + str(exc), file=sys.stderr)
        print('Execute novamente o mesmo comando para retomar. Para tentar somente o envio, use --retry-only.', file=sys.stderr)
        sys.exit(1)
