import test from 'node:test';
import assert from 'node:assert/strict';
import { searchOpenFoodFacts, fetchProductByBarcode, parseNutriments } from '../js/food-api.js';

test('parseNutriments extracts calories, protein, carbs, fat safely', () => {
  const nutriments = {
    'energy-kcal_100g': 165,
    'proteins_100g': 31,
    'carbohydrates_100g': 0,
    'fat_100g': 3.6
  };
  const parsed = parseNutriments(nutriments);
  assert.equal(parsed.calPer100g, 165);
  assert.equal(parsed.proteinPer100g, 31);
  assert.equal(parsed.carbsPer100g, 0);
  assert.equal(parsed.fatPer100g, 3.6);
});

test('parseNutriments handles missing nutriments and kJ fallbacks', () => {
  const nutriments = {
    'energy_100g': 837, // ~200 kcal
    'proteins': 12
  };
  const parsed = parseNutriments(nutriments);
  assert.equal(parsed.calPer100g, 200);
  assert.equal(parsed.proteinPer100g, 12);
  assert.equal(parsed.carbsPer100g, 0);
  assert.equal(parsed.fatPer100g, 0);
});

test('searchOpenFoodFacts parses products list from mock fetch', async () => {
  const mockResponse = {
    products: [
      {
        _id: '123456',
        product_name: 'Greek Yogurt 0%',
        brands: 'Fage',
        nutriments: {
          'energy-kcal_100g': 57,
          'proteins_100g': 10.3
        }
      }
    ]
  };

  const mockFetch = async () => ({
    ok: true,
    json: async () => mockResponse
  });

  const results = await searchOpenFoodFacts('Greek Yogurt', mockFetch);
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Greek Yogurt 0%');
  assert.equal(results[0].brand, 'Fage');
  assert.equal(results[0].calPer100g, 57);
  assert.equal(results[0].proteinPer100g, 10.3);
});

test('fetchProductByBarcode returns product on match and null on 404', async () => {
  const mockFetchFound = async () => ({
    ok: true,
    json: async () => ({
      status: 1,
      product: {
        _id: '011110038332',
        product_name: 'Whey Protein Powder',
        brands: 'Optimum Nutrition',
        nutriments: {
          'energy-kcal_100g': 375,
          'proteins_100g': 78
        }
      }
    })
  });

  const product = await fetchProductByBarcode('011110038332', mockFetchFound);
  assert.ok(product);
  assert.equal(product.name, 'Whey Protein Powder');
  assert.equal(product.proteinPer100g, 78);

  const mockFetchNotFound = async () => ({
    ok: true,
    json: async () => ({ status: 0 })
  });
  const notFound = await fetchProductByBarcode('999999999999', mockFetchNotFound);
  assert.equal(notFound, null);
});
