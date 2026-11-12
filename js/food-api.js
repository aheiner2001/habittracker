/**
 * OpenFoodFacts REST API & Nutrition Lookup
 */

export function parseNutriments(nutriments = {}) {
  let cal = 0;
  if (typeof nutriments['energy-kcal_100g'] === 'number') {
    cal = nutriments['energy-kcal_100g'];
  } else if (typeof nutriments['energy-kcal'] === 'number') {
    cal = nutriments['energy-kcal'];
  } else if (typeof nutriments['energy_100g'] === 'number') {
    // Convert kJ to kcal (~4.184 kJ / kcal)
    cal = Math.round(nutriments['energy_100g'] / 4.184);
  }

  const protein = typeof nutriments['proteins_100g'] === 'number'
    ? nutriments['proteins_100g']
    : (typeof nutriments['proteins'] === 'number' ? nutriments['proteins'] : 0);

  const carbs = typeof nutriments['carbohydrates_100g'] === 'number'
    ? nutriments['carbohydrates_100g']
    : (typeof nutriments['carbohydrates'] === 'number' ? nutriments['carbohydrates'] : 0);

  const fat = typeof nutriments['fat_100g'] === 'number'
    ? nutriments['fat_100g']
    : (typeof nutriments['fat'] === 'number' ? nutriments['fat'] : 0);

  return {
    calPer100g: Math.max(0, Math.round(cal * 10) / 10),
    proteinPer100g: Math.max(0, Math.round(protein * 10) / 10),
    carbsPer100g: Math.max(0, Math.round(carbs * 10) / 10),
    fatPer100g: Math.max(0, Math.round(fat * 10) / 10)
  };
}

export async function searchOpenFoodFacts(query, fetchFn = globalThis.fetch) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const encoded = encodeURIComponent(query.trim());
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=20`;

  try {
    const res = await fetchFn(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.products)) return [];

    return data.products
      .filter(p => p && (p.product_name || p.product_name_en))
      .map(p => {
        const nutriments = parseNutriments(p.nutriments || {});
        return {
          id: p._id || p.code || `off_${Math.random().toString(36).substring(2, 9)}`,
          name: p.product_name || p.product_name_en || 'Unknown Food',
          brand: p.brands || '',
          ...nutriments
        };
      });
  } catch (err) {
    console.warn('OpenFoodFacts search error:', err);
    return [];
  }
}

export async function fetchProductByBarcode(barcode, fetchFn = globalThis.fetch) {
  if (!barcode || typeof barcode !== 'string') {
    return null;
  }

  const clean = barcode.trim();
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json`;

  try {
    const res = await fetchFn(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.status !== 1 || !data.product) return null;

    const p = data.product;
    const nutriments = parseNutriments(p.nutriments || {});

    return {
      id: p._id || p.code || clean,
      name: p.product_name || p.product_name_en || 'Unknown Food',
      brand: p.brands || '',
      ...nutriments
    };
  } catch (err) {
    console.warn('OpenFoodFacts barcode error:', err);
    return null;
  }
}
