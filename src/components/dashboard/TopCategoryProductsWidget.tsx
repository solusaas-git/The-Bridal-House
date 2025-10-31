'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Search, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Reservation = {
  _id: string;
  items?: string[] | Array<{ _id: string }>; // reservation stores product ObjectIds
  client?: { firstName?: string; lastName?: string; weddingDate?: string };
  total?: number;
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
  const [details, setDetails] = useState<{
    open: boolean;
    product?: Product | null;
    rows: Array<{ id: string; customer: string; weddingDate: string; amount: number }>
  }>({ open: false, product: null, rows: [] });

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

  // Filter topTen based on search term
  const filteredTopTen = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return topTen;
    return topTen.filter(({ product }) => 
      product.name.toLowerCase().includes(term)
    );
  }, [topTen, searchTerm]);

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
        {filteredTopTen.length === 0 && searchTerm.trim() ? (
          <div className="text-sm text-gray-400">{t('widgets.topReservedProducts.noMatches')}</div>
        ) : filteredTopTen.length === 0 ? (
          <div className="text-sm text-gray-400">{t('widgets.topReservedProducts.noReservations')}</div>
        ) : (
          filteredTopTen.map(({ product, count }) => (
            <div key={product._id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 cursor-pointer" onClick={() => {
              // Build details rows from provided reservations prop
              const rows: Array<{ id: string; customer: string; weddingDate: string; amount: number }> = [];
              for (const r of reservations || []) {
                const items = (r.items || []) as any[];
                const has = items.some((it) => (typeof it === 'string' ? it : it?._id) === String(product._id));
                if (!has) continue;
                const fullName = `${r.client?.firstName || ''} ${r.client?.lastName || ''}`.trim() || '-';
                const wdIso = r.client?.weddingDate ? String(r.client.weddingDate) : '';
                const wd = wdIso ? `${wdIso.substring(8,10)}/${wdIso.substring(5,7)}/${wdIso.substring(0,4)}` : '-';
                const amt = typeof r.total === 'number' ? r.total : 0;
                rows.push({ id: r._id, customer: fullName, weddingDate: wd, amount: amt });
              }
              setDetails({ open: true, product, rows });
            }}>
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

      {/* Search results from API (other products in same category, not in top 10) */}
      {searchLoading && searchTerm.trim().length >= 2 && (
        <div className="text-xs text-gray-400 mt-2">{t('widgets.topReservedProducts.searching')}</div>
      )}

      {!searchLoading && searchTerm.trim().length >= 2 && searchResults.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            {t('widgets.topReservedProducts.otherProducts', { defaultValue: 'Other products in category' })}
          </h4>
          <div className="space-y-2">
            {searchResults.map((p) => (
              <div key={p._id} className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 cursor-pointer" onClick={() => {
                // Build details rows for this product
                const rows: Array<{ id: string; customer: string; weddingDate: string; amount: number }> = [];
                for (const r of reservations || []) {
                  const items = (r.items || []) as any[];
                  const has = items.some((it) => (typeof it === 'string' ? it : it?._id) === String(p._id));
                  if (!has) continue;
                  const fullName = `${r.client?.firstName || ''} ${r.client?.lastName || ''}`.trim() || '-';
                  const wdIso = r.client?.weddingDate ? String(r.client.weddingDate) : '';
                  const wd = wdIso ? `${wdIso.substring(8,10)}/${wdIso.substring(5,7)}/${wdIso.substring(0,4)}` : '-';
                  const amt = typeof r.total === 'number' ? r.total : 0;
                  rows.push({ id: r._id, customer: fullName, weddingDate: wd, amount: amt });
                }
                setDetails({ open: true, product: p, rows });
              }}>
                {p.primaryPhoto ? (
                  <img
                    src={imageUrlFor(p.primaryPhoto)}
                    alt={p.name}
                    className="w-10 h-10 rounded object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreview({ open: true, src: imageUrlFor(p.primaryPhoto), alt: p.name });
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 text-sm text-white">{p.name}</div>
                <div className="px-2 py-0.5 text-xs rounded bg-gray-500/20 text-gray-300 border border-gray-500/30">
                  {t('widgets.topReservedProducts.reservationsCount', { count: countFor(p._id) })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

      {/* Reservations details modal */}
      {details.open && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-3" onClick={() => setDetails({ open: false, product: null, rows: [] })}>
          <div className="bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl w-[95vw] sm:w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h4 className="text-white text-lg font-semibold">{t('widgets.topReservedProducts.detailsTitle', { product: details.product?.name })}</h4>
                <p className="text-xs text-gray-400 mt-1">{t('widgets.topReservedProducts.reservationsCount', { count: details.rows.length })}</p>
              </div>
              <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white text-sm" onClick={() => setDetails({ open: false, product: null, rows: [] })}>
                {t('widgets.topReservedProducts.close')}
              </button>
            </div>

            {/* Stats row */}
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-white/10 bg-white/5">
              {(() => {
                const now = new Date();
                const year = now.getUTCFullYear();
                const month = now.getUTCMonth();
                const monthStart = new Date(Date.UTC(year, month, 1));
                const nextMonthStart = new Date(Date.UTC(year, month + 1, 1));
                const inCurrentMonth = (iso: string) => {
                  const d = new Date(iso);
                  return d >= monthStart && d < nextMonthStart;
                };
                const currentMonthRevenue = details.rows.reduce((sum, r) => sum + (inCurrentMonth(r.weddingDate.split('/').reverse().join('-') + 'T00:00:00.000Z') ? r.amount : 0), 0);
                const totalRevenue = details.rows.reduce((sum, r) => sum + r.amount, 0);
                return (
                  <>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-gray-400">{t('widgets.topReservedProducts.stats.currentMonthRevenue')}</div>
                      <div className="text-white text-lg font-semibold mt-1">{currentMonthRevenue}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-gray-400">{t('widgets.topReservedProducts.stats.totalRevenue')}</div>
                      <div className="text-white text-lg font-semibold mt-1">{totalRevenue}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-gray-400">{t('widgets.topReservedProducts.stats.reservations')}</div>
                      <div className="text-white text-lg font-semibold mt-1">{details.rows.length}</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Table */}
            <div className="flex-1 p-5 overflow-auto">
              {details.rows.length === 0 ? (
                <div className="text-sm text-gray-400">{t('widgets.topReservedProducts.noDetails')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-gray-900/95">
                      <tr className="text-left text-gray-300">
                        <th className="py-2 pr-3">{t('widgets.topReservedProducts.columns.customer')}</th>
                        <th className="py-2 pr-3">{t('widgets.topReservedProducts.columns.weddingDate')}</th>
                        <th className="py-2 pr-3">{t('widgets.topReservedProducts.columns.amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.rows.map((row) => (
                        <tr key={row.id} className="border-t border-white/10 text-white hover:bg-white/5">
                          <td className="py-2 pr-3">{row.customer}</td>
                          <td className="py-2 pr-3">{row.weddingDate}</td>
                          <td className="py-2 pr-3">{row.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TopCategoryProductsWidget;

