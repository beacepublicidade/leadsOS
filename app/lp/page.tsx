"use client";

import { useEffect, useState } from "react";

interface Metric     { valor: string; descricao: string; }
interface Depoimento { nome: string; cargo?: string; texto: string; }

interface LPData {
  name:            string;
  brand_color:     string;
  whatsapp_number: string;
  lp_logo_url:     string;
  lp_headline:     string;
  lp_subheadline:  string;
  lp_cta_button:   string;
  lp_metrics:      Metric[];
  lp_dores:        string[];
  lp_beneficios:   string[];
  lp_depoimentos:  Depoimento[];
  lp_sobre:        string;
  lp_sobre_foto:   string;
}

export default function LandingPage() {
  const [lp,    setLp]    = useState<LPData | null>(null);
  const [utms,  setUtms]  = useState<Record<string, string>>({});

  useEffect(() => {
    const p   = new URLSearchParams(window.location.search);
    const cid = p.get("client_id") ?? "";
    const u: Record<string, string> = {};
    ["client_id","utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid","gclid"]
      .forEach((k) => { u[k] = p.get(k) ?? ""; });
    setUtms(u);

    if (cid) {
      fetch(`/api/public/client/${cid}`)
        .then((r) => r.json())
        .then((j) => { if (j.success) setLp(j.data); })
        .catch(() => {});

      // Pixel de rastreamento
      new Image().src = `/api/pixel?cid=${cid}&url=${encodeURIComponent(window.location.href)}`;
    }
  }, []);

  function openWhatsApp() {
    if (!lp?.whatsapp_number) return;
    const phone = lp.whatsapp_number.replace(/\D/g, "");
    const src   = utms.utm_campaign ? ` (Campanha: ${utms.utm_campaign})` : "";
    const msg   = encodeURIComponent(`Olá! Vi a página e gostaria de saber mais${src}.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  }

  const color   = lp?.brand_color ?? "#7c3aed";
  const hasWA   = !!lp?.whatsapp_number;

  if (!lp) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, border: `3px solid #ffffff22`, borderTop: `3px solid ${color}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#0a0a0f", color: "#fff", overflowX: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse  { 0%,100% { box-shadow: 0 0 0 0 ${color}66; } 50% { box-shadow: 0 0 0 12px ${color}00; } }
        .fade-up  { animation: fadeUp .7s ease both; }
        .fade-up2 { animation: fadeUp .7s ease .15s both; }
        .fade-up3 { animation: fadeUp .7s ease .3s  both; }
        .cta-btn:hover { opacity: .88; transform: translateY(-2px); }
        .cta-btn  { transition: opacity .2s, transform .2s; animation: pulse 2.5s infinite; }
        .card-dep:hover { transform: translateY(-4px); }
        .card-dep { transition: transform .2s; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,10,15,.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #ffffff11", padding: ".85rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {lp.lp_logo_url
          ? <img src={lp.lp_logo_url} alt={lp.name} style={{ height: 36, objectFit: "contain" }} />
          : <span style={{ fontWeight: 800, fontSize: "1.1rem", color }}>{lp.name}</span>
        }
        {hasWA && (
          <button onClick={openWhatsApp} className="cta-btn"
            style={{ background: color, color: "#fff", border: "none", borderRadius: 99, padding: ".45rem 1.25rem", fontWeight: 700, fontSize: ".85rem", cursor: "pointer" }}>
            {lp.lp_cta_button || "Falar agora →"}
          </button>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "7rem 1.5rem 4rem",
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${color}22 0%, transparent 70%), #0a0a0f`,
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 760 }}>
          {lp.lp_logo_url && (
            <div className="fade-up" style={{ marginBottom: "1.75rem" }}>
              <img src={lp.lp_logo_url} alt={lp.name} style={{ height: 56, objectFit: "contain" }} />
            </div>
          )}
          <div className="fade-up" style={{ display: "inline-block", background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 99, padding: ".3rem 1rem", fontSize: ".8rem", fontWeight: 600, color, marginBottom: "1.25rem", letterSpacing: ".05em", textTransform: "uppercase" }}>
            {lp.name}
          </div>
          <h1 className="fade-up2" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, lineHeight: 1.1, marginBottom: "1.25rem", letterSpacing: "-.02em" }}>
            {lp.lp_headline || "Transforme seu negócio com resultados reais"}
          </h1>
          <p className="fade-up3" style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)", color: "#ffffffaa", lineHeight: 1.7, marginBottom: "2.5rem", maxWidth: 600, margin: "0 auto 2.5rem" }}>
            {lp.lp_subheadline || "Estratégias comprovadas para empresas que querem crescer de verdade."}
          </p>
          {hasWA && (
            <button onClick={openWhatsApp} className="cta-btn fade-up3"
              style={{ background: color, color: "#fff", border: "none", borderRadius: 12, padding: "1rem 2.5rem", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", display: "inline-block" }}>
              {lp.lp_cta_button || "Falar no WhatsApp →"}
            </button>
          )}
        </div>
      </section>

      {/* ── MÉTRICAS ── */}
      {lp.lp_metrics.length > 0 && (
        <section style={{ padding: "3rem 1.5rem", background: "#0d0d15", borderTop: "1px solid #ffffff0a", borderBottom: "1px solid #ffffff0a" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            {lp.lp_metrics.map((m, i) => (
              <div key={i} style={{ flex: "1 1 160px", textAlign: "center", padding: "1.5rem 1rem" }}>
                <div style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, color, lineHeight: 1 }}>{m.valor}</div>
                <div style={{ fontSize: ".9rem", color: "#ffffffaa", marginTop: ".4rem" }}>{m.descricao}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── DORES ── */}
      {lp.lp_dores.length > 0 && (
        <section style={{ padding: "5rem 1.5rem", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)", fontWeight: 800, lineHeight: 1.2 }}>
              Você se identifica com algum desses problemas?
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            {lp.lp_dores.map((d, i) => (
              <div key={i} style={{ background: "#ffffff08", border: "1px solid #ffffff12", borderRadius: 12, padding: "1.25rem 1.5rem", display: "flex", alignItems: "flex-start", gap: ".75rem" }}>
                <span style={{ color: "#ef4444", fontSize: "1.1rem", flexShrink: 0, marginTop: ".1rem" }}>✗</span>
                <span style={{ color: "#ffffffcc", lineHeight: 1.5, fontSize: ".95rem" }}>{d}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── BENEFÍCIOS ── */}
      {lp.lp_beneficios.length > 0 && (
        <section style={{ padding: "5rem 1.5rem", background: `linear-gradient(135deg, ${color}11 0%, transparent 60%), #0d0d15` }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)", fontWeight: 800, lineHeight: 1.2 }}>
                O que você vai ter com a gente
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
              {lp.lp_beneficios.map((b, i) => (
                <div key={i} style={{ background: "#ffffff08", border: `1px solid ${color}33`, borderRadius: 12, padding: "1.25rem 1.5rem", display: "flex", alignItems: "flex-start", gap: ".75rem" }}>
                  <span style={{ color, fontSize: "1.1rem", flexShrink: 0, marginTop: ".1rem" }}>✓</span>
                  <span style={{ color: "#ffffffcc", lineHeight: 1.5, fontSize: ".95rem" }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── DEPOIMENTOS ── */}
      {lp.lp_depoimentos.length > 0 && (
        <section style={{ padding: "5rem 1.5rem" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)", fontWeight: 800 }}>
                O que nossos clientes dizem
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {lp.lp_depoimentos.map((d, i) => (
                <div key={i} className="card-dep" style={{ background: "#ffffff08", border: "1px solid #ffffff12", borderRadius: 16, padding: "1.75rem" }}>
                  <div style={{ color: color, fontSize: "1.25rem", marginBottom: "1rem", letterSpacing: ".1em" }}>★★★★★</div>
                  <p style={{ color: "#ffffffcc", lineHeight: 1.7, fontSize: ".95rem", marginBottom: "1.5rem" }}>&quot;{d.texto}&quot;</p>
                  <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color, fontSize: "1rem" }}>{d.nome[0]}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: ".9rem" }}>{d.nome}</div>
                      <div style={{ fontSize: ".78rem", color: "#ffffff66" }}>{d.cargo}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SOBRE ── */}
      {lp.lp_sobre && (
        <section style={{ padding: "5rem 1.5rem", background: "#0d0d15" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: "2.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {lp.lp_sobre_foto && (
              <img src={lp.lp_sobre_foto} alt="" style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover", border: `3px solid ${color}`, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1rem" }}>Quem está por trás disso</h2>
              <p style={{ color: "#ffffffaa", lineHeight: 1.8, fontSize: ".95rem" }}>{lp.lp_sobre}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "6rem 1.5rem", textAlign: "center", background: `radial-gradient(ellipse 70% 80% at 50% 50%, ${color}22 0%, transparent 70%)` }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 900, lineHeight: 1.15, marginBottom: "1.25rem" }}>
            Pronto para dar o próximo passo?
          </h2>
          <p style={{ color: "#ffffffaa", fontSize: "1.05rem", marginBottom: "2.5rem", lineHeight: 1.7 }}>
            Fale agora com a nossa equipe e descubra o que podemos fazer pelo seu negócio.
          </p>
          {hasWA && (
            <button onClick={openWhatsApp} className="cta-btn"
              style={{ background: color, color: "#fff", border: "none", borderRadius: 12, padding: "1.1rem 3rem", fontWeight: 800, fontSize: "1.15rem", cursor: "pointer" }}>
              {lp.lp_cta_button || "Falar no WhatsApp →"}
            </button>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "1.5rem", textAlign: "center", borderTop: "1px solid #ffffff0a" }}>
        <p style={{ fontSize: ".78rem", color: "#ffffff33" }}>
          © {new Date().getFullYear()} {lp.name} · Desenvolvido por Beace
        </p>
      </footer>

      {/* ── BOTÃO WHATSAPP FLUTUANTE (mobile) ── */}
      {hasWA && (
        <button onClick={openWhatsApp}
          style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 200, background: "#25d366", color: "#fff", border: "none", borderRadius: 99, padding: ".85rem 1.5rem", fontWeight: 700, fontSize: ".9rem", cursor: "pointer", boxShadow: "0 4px 20px rgba(37,211,102,.4)", display: "flex", alignItems: "center", gap: ".5rem" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Falar agora
        </button>
      )}
    </div>
  );
}
