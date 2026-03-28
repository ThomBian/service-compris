#!/usr/bin/env python3
"""Build src/i18n/locales/fr/campaign.json from en + French overlays."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EN_PATH = ROOT / "src/i18n/locales/en/campaign.json"
FR_PATH = ROOT / "src/i18n/locales/fr/campaign.json"


def main() -> None:
    with EN_PATH.open(encoding="utf-8") as f:
        fr = json.load(f)

    fr["corkboard"] = {
        "ledger": {
            "venueName": "Le Solstice",
            "shiftReport": "Compte-rendu de service",
            "revenue": "Chiffre d'affaires",
            "coversSeated": "Couverts assis",
            "salaries": "Salaires",
            "electricity": "Électricité",
            "foodWithCovers": "Nourriture ({{count}} cvrs)",
            "netProfit": "Résultat net",
            "cashOnHand": "Trésorerie",
            "ratingLabel": "Note",
            "ratingStars": "{{value}} ⭐",
        },
        "newspaper": {
            "masthead": "L'Observateur",
            "eveningEdition": "Édition du soir",
            "free": "Gratuit",
        },
        "letter": {
            "venueName": "Le Solstice",
            "internalMemo": "Note interne",
            "memoFallback": "…",
            "signatureV": "— V.",
            "signOffName": "M. V.",
            "psLine": "P.-S. {{text}}",
        },
        "log": {
            "venueName": "Le Solstice",
            "title": "Journal d'activité",
            "empty": "Aucune activité enregistrée.",
        },
        "footer": {
            "nightReady": "Nuit {{n}} — Prêt",
            "nightGameOver": "Nuit {{n}} — Fin de partie",
            "scrollHint": "← faire défiler →",
        },
        "cta": {
            "giveResignation": "Remettre ma démission.",
            "openRestaurant": "Ouvrir le restaurant",
        },
    }

    fr["fired"] = {
        "MORALE": {
            "ledgerStamp": "Déserté",
            "newspaperHeadline": "TOUT LE PERSONNEL QUITTE LE SOLSTICE EN PLEIN SERVICE",
            "newspaperDeck": "Des témoins évoquent un chaos feutré : cuisine et salle sont parties en même temps.",
            "newspaperBodyLeft": "Les clients ont vu l'équipe interrompre son travail et sortir par la cuisine. Un serveur aurait murmuré « pas pour tout l'or du monde ». Tables laissées en plan ; certains invités se sont servis au vin — petit réconfort, confirment les témoins.",
            "newspaperBodyRight": "L'hôte serait resté seul au podium quelques minutes avant la mise à noir. Le syndicat du secteur a été saisi. Notre correspondant signale la jarre à pourboires intacte au bar — détail rare et éloquent, rue du Solstice.",
            "letterSalutation": "À l'ancien hôte,",
            "letterBody": "L'équipe est partie. Tous — jusqu'à la vestiaire, qui ne part jamais en avance.\n\nUn restaurant sans équipe n'est qu'une salle de vaisselle sale. Je ne peux pas exploiter une salle de vaisselle sale.",
            "letterQuote": "Vous avez géré la file. Vous avez oublié les gens derrière vous. Il y a une différence — et vous savez maintenant ce qu'elle coûte.",
            "letterSignOff": "Avec regret,",
            "letterPS": "Elle est partie la première. Elle sent toujours venir les choses.",
        },
        "VIP": {
            "ledgerStamp": "Révoqué",
            "newspaperHeadline": "INVITÉ DE MARQUE REFUSÉ À L'ENTRÉE D'UN RESTAURANT",
            "newspaperDeck": "Incident diplomatique rue du Solstice : l'hôte aurait refusé l'entrée à une personnalité.",
            "newspaperBodyLeft": "Un dîner discret a viré à l'incident : un VIP se serait vu refuser l'entrée au Solstice pour une « politique non communiquée ». Son escorte l'a quitté sans commentaire. On l'a revu plus tard, seul, dans un bistro rive gauche.",
            "newspaperBodyRight": "Une protestation officielle a été déposée. Le propriétaire, par intermédiaire, n'a dit qu'une phrase : « Cette personne ne travaille plus ici. » L'hôte était injoignable. Son manteau, plié sur le trottoir. Il avait commencé à pleuvoir.",
            "letterSalutation": "À l'ancien hôte,",
            "letterBody": "Vous avez refusé quelqu'un qu'il ne fallait pas refuser.\n\nJ'ai reçu des appels que je ne voulais pas, de gens que je ne voulais pas entendre, pour une décision qui n'aurait pas dû être prise.",
            "letterQuote": "Les règles servent le restaurant. Le restaurant sert les gens. Certaines personnes, on ne les refuse pas. Ce n'est pas de la philosophie — c'est de la plomberie.",
            "letterSignOff": "Avec toute la chaleur qu'il me reste,",
            "letterPS": "Vos affaires personnelles seront envoyées. Un jour. Il pourrait pleuvoir.",
        },
        "BANNED": {
            "ledgerStamp": "Compromis",
            "newspaperHeadline": "UN FICHÉ S'ASSOIT AU SOLSTICE — LE SERVICE DÉRAILLE",
            "newspaperDeck": "Des sources confirment : une personne bannie a été accueillie et assise, service perturbé.",
            "newspaperBodyLeft": "Des initiés rapportent qu'une figure connue de la restauration est entrée au Solstice malgré le registre des interdits. Trois tables vidées, deux tables parties sans dessert.",
            "newspaperBodyRight": "L'hôte fautif aurait quitté les lieux. Le chef Balzac, sans se nommer, a seulement dit : « la liste existe pour une raison. » L'établissement reste ouvert mais refuse de commenter sa politique d'accueil.",
            "letterSalutation": "À l'ancien hôte,",
            "letterBody": "Vous avez assis quelqu'un de la liste des bannis.\n\nLa liste n'est pas une suggestion. Pas une ligne directrice. C'est le seul document de ce restaurant qui ne se trompe jamais.",
            "letterQuote": "Je vous ai donné une liste. Une seule. Elle disait exactement quoi ne pas faire. J'ai rarement le mot « incompréhension » — et pourtant.",
            "letterSignOff": "Sans autre cérémonie,",
            "letterPS": "Ne me citez pas comme référence.",
        },
    }

    n1 = fr["nights"]["1"]
    n1.update(
        {
            "newspaper": "LE SOLSTICE ROUVRE : TIENDRA-T-IL LA PRESSION ?",
            "newspaperDeck": "Deux ans de silence : la salle la plus commentée de la ville revient — avec un nouveau visage au podium.",
            "newspaperBodyLeft": "Les portes du Solstice se sont rouvertes hier pour la première fois depuis la fermeture — selon les uns pour des travaux, selon les autres pour un conflit bien plus personnel entre l'ancienne direction et son investisseur principal, M. V.\n\nLa file, une heure avant l'ouverture, valait déjà le spectacle : un ancien adjoint au maire, trois blogueurs culinaires rivaux, et un homme en lin blanc qui a refusé son nom mais a accepté une coupe offerte par un serveur de passage.",
            "newspaperBodyRight": "Le Solstice a-t-il changé ou seulement verni la surface ? Le nouveau hôte — dont le nom n'a pas filtré — fera le test. Une salle vit ou meurt au podium.\n\nNotre correspondant note onze minutes de retard sur les entrées et un panier à pain sans pinces, détail que M. V., aperçu dans le couloir, semble n'avoir pas remarqué. Rassurant ou inquiétant ? Nous reviendrons.",
            "quote": "Un restaurant, c'est du théâtre — et vous êtes le videur. Ne laissez pas les mauvais numéros monter sur scène.",
            "memo": "Ce soir, votre première. Les bases : la file, placer les clients, surveiller la salle.",
        }
    )

    n2 = fr["nights"]["2"]
    n2.update(
        {
            "newspaper": "LE NOUVEL HÔTE DONNE DES SIGNAUX — LE VRAI TEST COMMENCE.",
            "newspaperDeck": "Premières impressions : main ferme à l'entrée — mais la foule devient plus étrange, et la ville regarde.",
            "newspaperBodyLeft": "Deuxième soir, la file était plus longue d'un tiers. Curiosité sincère ou faim de ce qu'on nous interdit ? Les deux, tout aussi probables et dangereux.\n\nOn a vu l'hôte refuser au moins trois tables avant vingt-et-une heures. Deux partaient en souriant. La troisième pas, et son arrêt sur le trottoir laisse présager un avis sévère.",
            "newspaperBodyRight": "La vraie question — tiendra-t-on le cap quand les clients deviendront plus singuliers ? — reste sans réponse depuis la rue. Une table a été demandée par les voies officielles. Nous attendons toujours.\n\nM. V. n'a pas été vu. C'est peut-être le détail le plus parlant de la soirée.",
            "quote": "Les règles fondent la société. L'argent fonde ce bâtiment. Ne les confondez pas.",
            "memo": "Deux clients inhabituels ce soir. Vos choix définiront quelle maison nous devenons.",
        }
    )

    headlines_fr = {
        ("3", "default"): "LE RESTAURANT TROUVE SON RYTHME.",
        ("3", "underworld"): "BRUITS FORTS ET POURBOIRES GRAS AU BISTROT DU COIN.",
        ("3", "michelin"): "LE SOLSTICE EST-IL LE RESTAURANT LE PLUS STRICT DU MONDE ?",
        ("3", "viral"): "L'ENDROIT OÙ IL FAUT ÊTRE VU : LE SOLSTICE PART DANS LE MONDE ENTIER.",
        ("4", "default"): "QUATRIÈME NUIT AU SOLSTICE.",
        ("4", "underworld"): "ON MURMURE DES LIENS AVEC LE SYNDICAT ET DES POURBOIRES QUI COULENT.",
        ("4", "michelin"): "DES BRUITS D'INSPECTEUR DANS LA VILLE.",
        ("4", "viral"): "DES FILES AVANT L'HEURE D'OUVERTURE.",
        ("5", "default"): "LA VILLE REGARDE.",
        ("5", "underworld"): "ON COLPORTE DU BLANCHIMENT AU SOLSTICE.",
        ("5", "michelin"): "L'ÉLITE CULINAIRE AFFLUE VERS UN RESTAURANT IMPOSSIBLE À RÉSERVER.",
        ("5", "viral"): "BASTON D'INFLUENCEURS POUR LE DERNIER STEAK WAGYU.",
        ("6", "default"): "AVANT-DERNIER SERVICE.",
        ("6", "underworld"): "LE SYNDICAT RESSERRE SON ÉTREINTE.",
        ("6", "michelin"): "LE VERDICT DE L'INSPECTEUR APPROCHE.",
        ("6", "viral"): "L'EFFET VIRAL MONTE D'UN CRAN.",
        ("7", "default"): "LA DERNIÈRE NUIT.",
        ("7", "underworld"): "LE RAID — FLICS ET PARRAINS. NE LES LAISSEZ PAS TOUCHER.",
        ("7", "michelin"): "LES TROIS ÉTOILES — LA PERFECTION N'EST PAS UNE ATTENTE ; C'EST UNE MENACE.",
        ("7", "viral"): "LE DIRECT — 100 COUVERTS OU RIEN.",
    }

    for (night, path), headline in headlines_fr.items():
        fr["nights"][night][path]["newspaper"] = headline

    FR_PATH.write_text(json.dumps(fr, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote", FR_PATH)


if __name__ == "__main__":
    main()
