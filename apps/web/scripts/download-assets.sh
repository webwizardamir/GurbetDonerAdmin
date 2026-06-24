#!/usr/bin/env bash
# Re-fetches product/cert/hero assets using curl (Node fetch fails on Hostinger's TLS renego on Windows).
set -e
BASE="https://lightyellow-penguin-202886.hostingersite.com/wp-content/uploads/2025/11"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRODUCTS_DIR="$ROOT/public/images/products"
TRUST_DIR="$ROOT/public/images/trust"
HERO_DIR="$ROOT/public/images/hero"
mkdir -p "$PRODUCTS_DIR" "$TRUST_DIR" "$HERO_DIR"

dl() {
  local url="$1" dest="$2"
  if [[ -s "$dest" ]]; then echo "SKIP $(basename "$dest")"; return 0; fi
  if curl -sSfL --retry 3 --retry-delay 1 -o "$dest" "$url"; then
    echo "OK   $(basename "$dest")"
  else
    echo "FAIL $(basename "$dest") -> $url"
    rm -f "$dest"
  fi
}

# slug remote-file
PRODUCTS=(
  "sliced-roasted-chicken-kebab|new-chicken-1.jpg"
  "chicken-kebab|ChickenKebab.png"
  "chicken-burger|Chickenburger.png"
  "chicken-burger-2|new-burger-1.jpg"
  "chicken-nuggets|ChickenNuggets-2.png"
  "chicken-bites|ChickenBites.png"
  "chicken-meatball|ChickenMeatball.png"
  "chicken-schnitzel|Chickenschnitzel.png"
  "chicken-kipcorn|Chickenkipkorn-2.png"
  "chicken-fingers-classic|Chickenfingersclassic.png"
  "chicken-formed-tenders-classic|Chickenformedtendersclasssic.png"
  "chicken-formed-tenders-hot|Chickenformedtendershot.png"
  "crispy-tenders-classic|Crispytendersclassic.png"
  "crispy-tenders-hot|Crispytendershot.png"
  "crispy-burger|Crispyburger.png"
  "crispy-wings|Crispywings.png"
  "crispy-hot-wings|Crispyhotwings.png"
  "crispy-chicken-wings|Crispychickenwings.png"
  "chicken-wings-classic|Chickenwingsclassic.png"
  "chicken-wings-hot|Chickenwingshot.png"
  "chicken-wings-barbecue|Chickenwingsbarbecue.png"
  "cordon-bleu|Cordonbleu.png"
  "sliced-roasted-beef-kebab|new-beef-1-1.jpg"
  "beef-kebab|BeefKebab-1.png"
  "sucuk-doner|Sucukdoner-1.png"
  "shawarma|shawarma-1.jpg"
  "adana-kebab|adana-1.png"
  "akcaabat|akcaabat-1-1.png"
  "cevapcici|Cevapcici-1.png"
  "zoogets|Zoogets.png"
  "steak-haches|steakhaches-1.png"
  "beef-burger|Beef-1.png"
  "natural-burger|naturalBurger-1.png"
  "onion-burger|onionBurger-1.png"
  "spicy-burger|spicyBurger-1.png"
  "frikandel|new-frik-1.jpg"
  "mozzarella-sticks|Mozarellasticks-2-1.png"
  "cheese-nuggets|CheeseNuggets-2-1.png"
  "chilli-cheese-nuggets|Chilicheesenugget-1.png"
  "potato-burger|Potatoburger.png"
  "onion-rings|Onionrings.png"
  "manti|Manti.png"
  "iskembe|Iskembe.png"
  "falafel|Falafel.png"
  "fish-burger|Fishburger-2-1.png"
  "crispy-panko-shrimp|Crispypankoshrimp-2-1.png"
)

TRUST=(
  "halal-certified.png|1min-1676932219279_1.png"
  "no-hormones.png|2min-1676932223426_1.png"
  "humanely-raised.png|4min-1676932223421_1.png"
  "satisfaction.png|5min-1676932223419_1.png"
)

HERO=(
  "hero-spread.webp|Generated-Image-November-09-2025-12_15AM-1-1.webp"
  "hero-platter.webp|Generated-Image-November-09-2025-12_12AM-2-1.webp"
  "field.webp|cows-stand-on-grass-looking-down-towards-the-camera.webp"
)

for entry in "${PRODUCTS[@]}"; do
  IFS='|' read -r slug remote <<<"$entry"
  ext="${remote##*.}"
  dl "$BASE/$remote" "$PRODUCTS_DIR/$slug.$ext"
done

for entry in "${TRUST[@]}"; do
  IFS='|' read -r local remote <<<"$entry"
  dl "$BASE/$remote" "$TRUST_DIR/$local"
done

for entry in "${HERO[@]}"; do
  IFS='|' read -r local remote <<<"$entry"
  dl "$BASE/$remote" "$HERO_DIR/$local"
done

echo "done"
