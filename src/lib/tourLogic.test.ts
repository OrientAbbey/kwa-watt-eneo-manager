import { describe, it, expect } from "vitest";
import {
  TOUR_SEEN_KEY, clampIndex, computePopoverPosition, decideTourOffer, hasUserData, navKey, pickTarget, readTourSeen, spotlightRect, writeTourSeen,
  type Rect,
} from "./tourLogic";

const memStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
  };
};

describe("persistance du drapeau « visite vue »", () => {
  it("vaut 0 quand la visite n'a jamais été vue", () => {
    expect(readTourSeen(memStorage())).toBe(0);
  });
  it("relit la version enregistrée", () => {
    const s = memStorage();
    writeTourSeen(s, 3);
    expect(s.data.get(TOUR_SEEN_KEY)).toBe("3");
    expect(readTourSeen(s)).toBe(3);
  });
  it.each(["abc", "", "-2", "0", "NaN"])("ignore la valeur illisible %j", (raw) => {
    expect(readTourSeen(memStorage({ [TOUR_SEEN_KEY]: raw }))).toBe(0);
  });
  it("ne plante pas si le stockage est indisponible", () => {
    const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("full"); } };
    expect(readTourSeen(broken)).toBe(0);
    expect(() => writeTourSeen(broken, 1)).not.toThrow();
  });
  it("n'écrit QUE sa propre clé : les données de l'utilisateur ne sont jamais touchées", () => {
    const s = memStorage({ eneo_app_data: "{\"meters\":[]}", eneo_app_data_photos: "{}" });
    writeTourSeen(s, 1);
    expect([...s.data.keys()].sort()).toEqual(["eneo_app_data", "eneo_app_data_photos", TOUR_SEEN_KEY].sort());
    expect(s.data.get("eneo_app_data")).toBe("{\"meters\":[]}");
  });
});

describe("decideTourOffer : qui voit la visite ?", () => {
  it("nouvel utilisateur (rien vu, aucune donnée) : démarrage automatique", () => {
    expect(decideTourOffer({ seenVersion: 0, currentVersion: 1, hasUserData: false })).toBe("auto");
  });
  it("utilisateur EXISTANT après mise à jour : proposition, jamais démarrage automatique", () => {
    expect(decideTourOffer({ seenVersion: 0, currentVersion: 1, hasUserData: true })).toBe("offer");
  });
  it("visite déjà terminée (ou refusée) : plus rien, même avec des données", () => {
    expect(decideTourOffer({ seenVersion: 1, currentVersion: 1, hasUserData: true })).toBe("none");
    expect(decideTourOffer({ seenVersion: 1, currentVersion: 1, hasUserData: false })).toBe("none");
  });
  it("visite vue mais contenu plus récent : on propose les nouveautés", () => {
    expect(decideTourOffer({ seenVersion: 1, currentVersion: 2, hasUserData: true })).toBe("whatsnew");
    expect(decideTourOffer({ seenVersion: 1, currentVersion: 2, hasUserData: false })).toBe("whatsnew");
  });
  it("une version « vue » plus récente que l'application (retour en arrière) ne relance rien", () => {
    expect(decideTourOffer({ seenVersion: 5, currentVersion: 2, hasUserData: false })).toBe("none");
  });
});

describe("hasUserData", () => {
  const empty = { consumptions: [], recharges: [], emergencyCredits: [], profile: { meterNumber: "" } };
  it("compteur vide = nouvel utilisateur", () => expect(hasUserData([empty])).toBe(false));
  it("une recharge, un relevé, un crédit d'urgence ou un numéro de compteur suffisent", () => {
    expect(hasUserData([{ ...empty, recharges: [{}] }])).toBe(true);
    expect(hasUserData([{ ...empty, consumptions: [{}] }])).toBe(true);
    expect(hasUserData([{ ...empty, emergencyCredits: [{}] }])).toBe(true);
    expect(hasUserData([{ ...empty, profile: { meterNumber: " 0123 " } }])).toBe(true);
  });
  it("considère tous les compteurs", () => expect(hasUserData([empty, { ...empty, recharges: [{}] }])).toBe(true));
  it("tolère des champs absents", () => expect(hasUserData([{}])).toBe(false));
});

describe("clampIndex / navKey", () => {
  it("garde l'index dans les bornes", () => {
    expect(clampIndex(-3, 5)).toBe(0);
    expect(clampIndex(2, 5)).toBe(2);
    expect(clampIndex(9, 5)).toBe(4);
    expect(clampIndex(3, 0)).toBe(0);
  });
  it("même onglet + même action = même destination ; sans onglet = chaîne vide", () => {
    expect(navKey({ tab: "history", intent: { type: "paste-sms" } })).toBe(navKey({ tab: "history", intent: { type: "paste-sms" } }));
    expect(navKey({ tab: "history", intent: { type: "paste-sms" } })).not.toBe(navKey({ tab: "history", intent: { type: "add-recharge" } }));
    expect(navKey({ tab: "history" })).not.toBe(navKey({ tab: "services" }));
    expect(navKey({})).toBe("");
    expect(navKey(undefined)).toBe("");
  });
});

describe("pickTarget : premier élément VISIBLE", () => {
  const el = (name: string) => ({ name }) as unknown as Element;
  const rootOf = (map: Record<string, Element[]>) => ({ querySelectorAll: (sel: string) => { if (sel === "!!bad") throw new SyntaxError("bad selector"); return map[sel] ?? []; } }) as unknown as ParentNode;
  const visible = (e: Element) => (e as unknown as { name: string }).name.startsWith("v");

  it("ignore l'élément caché (variante mobile / bureau) et prend celui qui est affiché", () => {
    const fab = el("v-fab");
    expect(pickTarget(["#a"], rootOf({ "#a": [el("hidden-header"), fab] }), visible)).toBe(fab);
  });
  it("essaie les sélecteurs dans l'ordre", () => {
    const second = el("v-second");
    expect(pickTarget(["#none", "#b"], rootOf({ "#b": [second] }), visible)).toBe(second);
  });
  it("renvoie null si aucune cible visible (la visite se rabat sur une carte centrée)", () => {
    expect(pickTarget(["#a"], rootOf({ "#a": [el("hidden")] }), visible)).toBeNull();
    expect(pickTarget([], rootOf({}), visible)).toBeNull();
    expect(pickTarget(undefined, rootOf({}), visible)).toBeNull();
  });
  it("un sélecteur invalide est ignoré au lieu de faire échouer la visite", () => {
    const ok = el("v-ok");
    expect(pickTarget(["!!bad", "#ok"], rootOf({ "#ok": [ok] }), visible)).toBe(ok);
  });
});

describe("spotlightRect", () => {
  const vp = { width: 400, height: 800 };
  it("élargit la cible d'une marge", () => {
    expect(spotlightRect({ top: 100, left: 50, width: 120, height: 40 }, vp)).toEqual({ top: 94, left: 44, width: 132, height: 52 });
  });
  it("reste dans l'écran (cible collée au bord)", () => {
    expect(spotlightRect({ top: 2, left: 2, width: 50, height: 50 }, vp)).toEqual({ top: 0, left: 0, width: 58, height: 58 });
    const r = spotlightRect({ top: 780, left: 380, width: 60, height: 60 }, vp);
    expect(r.left + r.width).toBeLessThanOrEqual(400);
    expect(r.top + r.height).toBeLessThanOrEqual(800);
  });
});

describe("computePopoverPosition", () => {
  const vp = { width: 400, height: 800 };
  const pop = { width: 300, height: 150 };
  const target = (o: Partial<Rect>): Rect => ({ top: 300, left: 100, width: 100, height: 40, ...o });

  it("sans cible : carte centrée, sans flèche", () => {
    expect(computePopoverPosition(null, pop, vp)).toEqual({ top: 325, left: 50, placement: "center", arrowLeft: null });
  });

  it("cible en haut : la bulle se pose DESSOUS, collée à la cible avec un écart", () => {
    const p = computePopoverPosition(target({ top: 60, left: 20, width: 100 }), pop, vp);
    expect(p.placement).toBe("bottom");
    expect(p.top).toBe(60 + 40 + 14);
    expect(p.left).toBe(12); // centrée aurait donné -80 : ramenée dans l'écran
    expect(p.arrowLeft).toBe(70 - 12); // la flèche pointe toujours le centre de la cible
  });

  it("cible en bas (bouton flottant, barre du bas) : la bulle se pose DESSUS", () => {
    const p = computePopoverPosition(target({ top: 720 }), pop, vp);
    expect(p.placement).toBe("top");
    expect(p.top).toBe(720 - 14 - 150);
  });

  it("respecte le côté demandé quand il y a la place, sinon se rabat sur l'autre", () => {
    expect(computePopoverPosition(target({ top: 400 }), pop, vp, { prefer: "top" }).placement).toBe("top");
    expect(computePopoverPosition(target({ top: 60 }), pop, vp, { prefer: "top" }).placement).toBe("bottom");
    expect(computePopoverPosition(target({ top: 720 }), pop, vp, { prefer: "bottom" }).placement).toBe("top");
  });

  it("cible au bord droit : bulle ramenée dans l'écran, flèche bornée dans la bulle", () => {
    const p = computePopoverPosition(target({ left: 360, width: 30, top: 100 }), pop, vp);
    expect(p.left).toBe(400 - 300 - 12);
    expect(p.arrowLeft).toBeLessThanOrEqual(300 - 16);
    expect(p.arrowLeft).toBeGreaterThanOrEqual(16);
  });

  it("cible immense (aucune place dessus ni dessous) : bulle posée sur la moitié opposée, sans flèche", () => {
    const tall = computePopoverPosition(target({ top: 60, height: 700 }), pop, vp);
    expect(tall.placement).toBe("center");
    expect(tall.arrowLeft).toBeNull();
    const upper = computePopoverPosition(target({ top: 10, height: 300 }), { width: 300, height: 520 }, vp);
    expect(upper.placement).toBe("center");
    expect(upper.top).toBe(800 - 520 - 12); // cible plutôt en haut : bulle en bas
  });

  it("petit écran (320 × 568) : la bulle ne sort jamais de l'écran, quelle que soit la cible", () => {
    const small = { width: 320, height: 568 };
    const p = { width: 296, height: 260 };
    for (let top = 0; top <= 540; top += 30) {
      for (let left = 0; left <= 300; left += 40) {
        for (const height of [20, 60, 200, 500]) {
          const r = computePopoverPosition({ top, left, width: 60, height }, p, small);
          expect(r.left).toBeGreaterThanOrEqual(12);
          expect(r.left + p.width).toBeLessThanOrEqual(small.width - 12);
          expect(r.top).toBeGreaterThanOrEqual(12);
          expect(r.top + p.height).toBeLessThanOrEqual(small.height - 12);
        }
      }
    }
  });

  it("bulle plus grande que l'écran : pas de valeur aberrante", () => {
    const r = computePopoverPosition(target({}), { width: 900, height: 2000 }, { width: 360, height: 640 });
    expect(Number.isFinite(r.top) && Number.isFinite(r.left)).toBe(true);
    expect(r.top).toBeGreaterThanOrEqual(12);
    expect(r.left).toBeGreaterThanOrEqual(12);
  });
});
