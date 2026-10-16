import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { test } from "node:test";

const fixture = await readFile(new URL("./fixtures/existing-schema.sql", import.meta.url), "utf8");
const migration = await readFile(
  new URL("../supabase/migrations/20261016120000_imported_offers.sql", import.meta.url),
  "utf8"
);
const admin = "11111111-1111-4111-8111-111111111111";
const nonAdmin = "22222222-2222-4222-8222-222222222222";
const store = "33333333-3333-4333-8333-333333333333";
const offer = (id = "offer-1", time = "2026-01-01T10:00:00Z", title = "Jogo PS5") => ({
  source: "pelando",
  external_id: id,
  title,
  collected_at: time,
});

test("Migração, entrega idempotente, revisão, RLS e conversão atômica", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(fixture);
    await db.exec(migration);
    await db.query("insert into auth.users(id) values ($1),($2)", [admin, nonAdmin]);
    await db.query("insert into public.user_roles(user_id) values ($1)", [admin]);
    await db.query("insert into public.stores(id,name) values ($1,'Amazon')", [store]);
    await db.exec("insert into public.platforms(id,name) values ('ps5','PlayStation 5')");
    const role = async (name, user = "") => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
      await db.exec("set role " + name);
    };
    const intake = async (items) =>
      db.query("select public.ingest_imported_offers($1::jsonb) as receipt", [
        JSON.stringify(items),
      ]);
    let id;
    await t.test("somente service_role pode receber ofertas; reenvio não duplica", async () => {
      await role("service_role");
      await intake([offer()]);
      await intake([offer()]);
      await db.exec("reset role");
      const rows = await db.query("select * from public.imported_offers");
      assert.equal(rows.rows.length, 1);
      id = rows.rows[0].id;
      await role("authenticated", admin);
      await assert.rejects(intake([offer("bad")]), /permission denied/i);
    });
    await t.test("verificação posterior enriquece a mesma coleta sem regredir", async () => {
      await role("service_role");
      await intake([
        {
          ...offer(),
          verification: { checked_at: "2026-01-01T11:00:00Z", result: "boxed_code_in_store" },
        },
      ]);
      await intake([offer()]);
      await intake([
        { ...offer(), verification: { checked_at: "2026-01-01T10:30:00Z", result: "unverified" } },
      ]);
      await db.exec("reset role");
      const r = (await db.query("select source_data from public.imported_offers where id=$1", [id]))
        .rows[0];
      assert.equal(r.source_data.verification.result, "boxed_code_in_store");
    });
    await t.test("anon e usuário comum não acessam importações; admin lê", async () => {
      await role("anon");
      await assert.rejects(db.query("select * from public.imported_offers"), /permission denied/i);
      await role("authenticated", nonAdmin);
      assert.equal((await db.query("select * from public.imported_offers")).rows.length, 0);
      await assert.rejects(
        db.query("select public.review_imported_offer($1,'discarded')", [id]),
        /Admin required/
      );
      await assert.rejects(
        db.query("select public.convert_imported_offer($1,'{}')", [id]),
        /Admin required/
      );
      await role("authenticated", admin);
      assert.equal((await db.query("select * from public.imported_offers")).rows.length, 1);
      await assert.rejects(
        db.query("update public.imported_offers set source_data='{}'"),
        /permission denied/i
      );
    });
    await t.test("dados novos preservam descarte e revisão antiga não sobrescreve", async () => {
      await db.query("select public.review_imported_offer($1,'discarded')", [id]);
      await role("service_role");
      await intake([offer("offer-1", "2026-01-02T10:00:00Z", "Título novo")]);
      await intake([offer("offer-1", "2026-01-01T10:00:00Z", "Título antigo")]);
      await role("authenticated", admin);
      const r = (await db.query("select * from public.imported_offers where id=$1", [id])).rows[0];
      assert.equal(r.source_data.title, "Título novo");
      assert.equal(r.review_status, "discarded");
      assert.equal(r.reviewed_by, admin);
      await assert.rejects(
        db.query("select public.convert_imported_offer($1,'{}')", [id]),
        /Restore/
      );
      await db.query("select public.review_imported_offer($1,'pending')", [id]);
    });
    const values = {
      title: "Título revisado",
      price_cents: 25900,
      store_id: store,
      platform_id: "ps5",
      deal_url: "https://www.amazon.com.br/dp/B012345678",
      status: "published",
    };
    await t.test("conversão inválida não cria oferta nem marca como importada", async () => {
      await assert.rejects(
        db.query("select public.convert_imported_offer($1,$2::jsonb)", [
          id,
          JSON.stringify({ ...values, platform_id: "inexistente" }),
        ]),
        /foreign key/
      );
      assert.equal((await db.query("select * from public.deals")).rows.length, 0);
      assert.equal(
        (await db.query("select review_status from public.imported_offers where id=$1", [id]))
          .rows[0].review_status,
        "pending"
      );
    });
    let deal;
    await t.test("repetição da conversão retorna o mesmo rascunho", async () => {
      deal = (
        await db.query("select public.convert_imported_offer($1,$2::jsonb) as id", [
          id,
          JSON.stringify(values),
        ])
      ).rows[0].id;
      assert.equal(
        (
          await db.query("select public.convert_imported_offer($1,$2::jsonb) as id", [
            id,
            JSON.stringify(values),
          ])
        ).rows[0].id,
        deal
      );
      const rows = (await db.query("select * from public.deals")).rows;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].status, "draft");
      assert.equal(rows[0].created_by, admin);
      await role("anon");
      assert.equal((await db.query("select * from public.deals")).rows.length, 0);
    });
    await t.test("novas coletas não alteram os campos revisados da oferta criada", async () => {
      await role("service_role");
      await intake([offer("offer-1", "2026-01-03T10:00:00Z", "Título da fonte alterado")]);
      await role("authenticated", admin);
      assert.equal(
        (await db.query("select title from public.deals where id=$1", [deal])).rows[0].title,
        "Título revisado"
      );
      assert.equal(
        (await db.query("select review_status from public.imported_offers where id=$1", [id]))
          .rows[0].review_status,
        "imported"
      );
    });
    await t.test("lote inválido reverte todas as inserções", async () => {
      await role("service_role");
      await assert.rejects(intake([offer("rollback"), { source: "invalid" }]));
      await role("authenticated", admin);
      assert.equal(
        (await db.query("select * from public.imported_offers where external_id='rollback'")).rows
          .length,
        0
      );
    });
  } finally {
    await db.close();
  }
});
