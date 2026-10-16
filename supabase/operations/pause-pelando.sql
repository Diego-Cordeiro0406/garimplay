-- Pausa no disparador SQL, evitando novas chamadas Edge enquanto estiver desabilitado.
update public.collector_control set enabled=false where id='pelando';
-- Para retomar, execute: update public.collector_control set enabled=true where id='pelando';
