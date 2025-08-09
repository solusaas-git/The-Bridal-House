'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Search, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Reservation = {
  _id: string;
  items?: string[] | Array<{ _id: string }>; // reservation stores product ObjectIds
};

type Product = {
  _id: string;
  name: string;
  primaryPhoto?: string;
  category?: string | { _id: string };
};

interface Props {
  products: Product[];
  reservations: Reservation[];
  categoryId: string;
  title?: string;
}

const imageUrlFor = (primaryPhoto?: string) =>
  primaryPhoto ? `/api/uploads/${primaryPhoto}` : '';

const TopCategoryProductsWidget: React.FC<Props> = ({ products, reservations, categoryId, title }) => {
  const { t } = useTranslation('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [preview, setPreview] = useState<{ open: boolean; src: string; alt: string }>(
    { open: false, src: '', alt: '' }
  );

  // Map of productId -> Product limited to given category
  const categoryProductsMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products || []) {
      const catId = typeof p.category === 'object' ? (p.category as any)?._id : p.category;
      if (catId && String(catId) === String(categoryId)) {
        map.set(String(p._id), p);
      }
    }
    return map;
  }, [products, categoryId]);

  // Count reservations per product within the category
  const counts = useMemo(() => {
    const counter = new Map<string, number>();
    for (const r of reservations || []) {
      const items = (r.items || []) as any[];
      for (const it of items) {
        const id = typeof it === 'string' ? it : it?._id;
        if (!id) continue;
        if (!categoryProductsMap.has(String(id))) continue;
        counter.set(String(id), (counter.get(String(id)) || 0) + 1);
      }
    }
    return counter;
  }, [reservations, categoryProductsMap]);

  const topTen = useMemo(() => {
    const list: Array<{ product: Product; count: number }> = [];
    for (const [id, count] of counts) {
      const product = categoryProductsMap.get(id);
      if (product) list.push({ product, count });
    }
    list.sort((a, b) => b.count - a.count);
    return list.slice(0, 10);
  }, [counts, categoryProductsMap]);

  // Debounced search in products API, then filter by category and exclude top10
  useEffect(() => {
    const handler = setTimeout(async () => {
      const term = searchTerm.trim();
      if (term.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        setSearchLoading(true);
        const res = await axios.get('/api/products', { params: { limit: 50, search: term, category: categoryId } });
        const results: Product[] = res.data?.products || [];
        const topIds = new Set(topTen.map(({ product }) => String(product._id)));
        const filtered = results.filter((p) => !topIds.has(String(p._id)));
        setSearchResults(filtered);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm, categoryId, topTen]);

  const countFor = (productId: string) => counts.get(String(productId)) || 0;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">{title || 'Top Reserved Products'}</h3>
        {/* Search at top */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('widgets.topReservedProducts.searchPlaceholder', { defaultValue: 'Search other products in category...' })}
            className="pl-9 pr-3 py-2 w-full bg-white/10 border border-white/20 rounded-md text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Top 10 list */}
      <div className="space-y-3">
        {topTen.length === 0 ? (
          <div className="text-sm text-gray-400">{t('widgets.topReservedProducts.noReservations')}</div>
        ) : (
          topTen.map(({ product, count }) => (
            <div key={product._id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
              {product.primaryPhoto ? (
                <img
                  src={imageUrlFor(product.primaryPhoto)}
                  alt={product.name}
                  className="w-12 h-12 rounded object-cover cursor-pointer"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  onClick={() => setPreview({ open: true, src: imageUrlFor(product.primaryPhoto), alt: product.name })}
                />
              ) : (
                <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-300" />
                </div>
              )}
              <div className="flex-1">
                <div className="text-sm text-white font-medium">{product.name}</div>
              </div>
              <div className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {t('widgets.topReservedProducts.reservationsCount', { count })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Search other products in DB (same category, not in top 10) */}
      <div className="mt-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search other products in category..."
            className="pl-9 pr-3 py-2 w-full bg-white/10 border border-white/20 rounded-md text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {searchLoading && (
          <div className="text-xs text-gray-400 mt-2">{t('widgets.topReservedProducts.searching')}</div>
        )}

        {!searchLoading && searchTerm.trim().length >= 2 && (
          <div className="space-y-2 mt-3">
            {searchResults.length === 0 ? (
              <div className="text-xs text-gray-400">{t('widgets.topReservedProducts.noMatches')}</div>
            ) : (
              searchResults.map((p) => (
                <div key={p._id} className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded">
                  {p.primaryPhoto ? (
                    <img
                      src={imageUrlFor(p.primaryPhoto)}
                      alt={p.name}
                      className="w-10 h-10 rounded object-cover cursor-pointer"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                      onClick={() => setPreview({ open: true, src: imageUrlFor(p.primaryPhoto), alt: p.name })}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 text-sm text-white">{p.name}</div>
                  <div className="px-2 py-0.5 text-xs rounded bg-gray-500/20 text-gray-300 border border-gray-500/30">
                    {countFor(p._id)} reservations
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {/* Image preview modal */}
      {preview.open && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center" onClick={() => setPreview({ open: false, src: '', alt: '' })}>
          <div className="max-w-3xl max-h-[85vh] p-2" onClick={(e) => e.stopPropagation()}>
            <img src={preview.src} alt={preview.alt} className="max-w-full max-h-[80vh] rounded shadow-2xl" />
            <div className="text-center text-gray-300 mt-2 text-sm">{preview.alt}</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TopCategoryProductsWidget;

