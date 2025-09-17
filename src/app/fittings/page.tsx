'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useTranslation } from 'react-i18next';
import { EyeOpenIcon, Pencil1Icon, TrashIcon, Cross2Icon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { createPortal } from 'react-dom';
import Link from 'next/link';

export default function FittingsPage() {
  const { t } = useTranslation('fittings');
  const currentUser = useSelector((s: RootState) => s.auth.currentUser);
  const [fittings, setFittings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ open: boolean; items: any[]; index: number }>(() => ({ open: false, items: [], index: 0 }));
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilters, setDateFilters] = useState({ startDate: '', endDate: '' });
  const [statusFilter, setStatusFilter] = useState<string[]>(['Confirmed', 'Pending']);
  const [localStatusFilter, setLocalStatusFilter] = useState<string[]>(['Confirmed', 'Pending']);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        const params: any = { limit: 50 };
        if (searchTerm) params.search = searchTerm;
        if (dateFilters.startDate) params.startDate = dateFilters.startDate;
        if (dateFilters.endDate) params.endDate = dateFilters.endDate;
        if (statusFilter.length) params.status = statusFilter.join(',');
        const res = await axios.get('/api/fittings', { signal: controller.signal, params });
        setFittings(res.data?.fittings || []);
      } catch (e) {
        // ignore abort errors
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [searchTerm, dateFilters.startDate, dateFilters.endDate, statusFilter]);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">{t('list.title')}</h1>
          <Link href="/fittings/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">{t('list.newButton')}</Link>
        </div>

        {/* Filters */}
        <div className="bg-white/10 border border-white/10 rounded-lg p-4 mb-3">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
            <div className="relative w-full lg:flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('create.searchCustomersPlaceholder') as string} className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-medium text-gray-300 whitespace-nowrap">{t('common.fittingDate')}</label>
              <input type="date" value={dateFilters.startDate} onChange={(e) => setDateFilters(prev => ({ ...prev, startDate: e.target.value }))} className="px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-400">—</span>
              <input type="date" value={dateFilters.endDate} onChange={(e) => setDateFilters(prev => ({ ...prev, endDate: e.target.value }))} className="px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto" ref={statusDropdownRef}>
              <label className="text-xs font-medium text-gray-300 whitespace-nowrap">{t('common.status')}</label>
              <button
                onClick={() => {
                  if (!isStatusDropdownOpen) setLocalStatusFilter(statusFilter);
                  setIsStatusDropdownOpen(!isStatusDropdownOpen);
                }}
                className="px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px] flex items-center justify-between"
              >
                <span>
                  {statusFilter.length === 0
                    ? t('filters.allStatuses')
                    : statusFilter.length === 1
                      ? t(`statuses.${statusFilter[0] === 'Reservé' ? 'reserved' : statusFilter[0].toLowerCase()}`)
                      : `${statusFilter.length} ${t('filters.selected')}`}
                </span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isStatusDropdownOpen && createPortal(
                <div
                  className="absolute z-[9999] mt-1 bg-gray-800 border border-white/20 rounded-md shadow-lg min-w-[180px]"
                  style={{
                    top: statusDropdownRef.current ? statusDropdownRef.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
                    left: statusDropdownRef.current ? statusDropdownRef.current.getBoundingClientRect().left + window.scrollX : 0,
                  }}
                >
                  {[{v:'Confirmed',k:'confirmed'},{v:'Pending',k:'pending'},{v:'Cancelled',k:'cancelled'},{v:'Reservé',k:'reserved'}].map(opt => (
                    <label key={opt.v} className="flex items-center px-3 py-2 hover:bg-white/10 cursor-pointer text-xs text-white">
                      <input
                        type="checkbox"
                        checked={localStatusFilter.includes(opt.v)}
                        onChange={(e) => {
                          if (e.target.checked) setLocalStatusFilter([...localStatusFilter, opt.v]);
                          else setLocalStatusFilter(localStatusFilter.filter(s => s !== opt.v));
                        }}
                        className="mr-2 rounded"
                      />
                      {t(`statuses.${opt.k}`)}
                    </label>
                  ))}
                  <div className="border-t border-white/20 p-2 flex gap-2">
                    <button onClick={() => { setStatusFilter(localStatusFilter); setIsStatusDropdownOpen(false); }} className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">{t('filters.apply')}</button>
                    <button onClick={() => { setLocalStatusFilter(statusFilter); setIsStatusDropdownOpen(false); }} className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors">{t('filters.cancel')}</button>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/10 border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-300">
              <tr>
                <th className="text-left p-3">{t('list.columns.customer')}</th>
                <th className="text-left p-3">{t('list.columns.weddingDate')}</th>
                <th className="text-left p-3">{t('list.columns.fittingDate')}</th>
                <th className="text-left p-3">{t('common.status')}</th>
                <th className="text-left p-3">{t('list.columns.items')}</th>
                <th className="text-right p-3">{t('list.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-4 text-gray-400" colSpan={6}>{t('list.loading')}</td></tr>
              ) : fittings.length === 0 ? (
                <tr><td className="p-4 text-gray-400" colSpan={6}>{t('list.empty')}</td></tr>
              ) : fittings.map((f) => {
                const d = f?.pickupDate ? String(f.pickupDate) : '';
                const date = d ? `${d.substring(8,10)}/${d.substring(5,7)}/${d.substring(0,4)} ${d.substring(11,16)}` : '-';
                const wdStr = f?.client?.weddingDate ? String(f.client.weddingDate) : '';
                const weddingDate = wdStr ? `${wdStr.substring(8,10)}/${wdStr.substring(5,7)}/${wdStr.substring(0,4)}` : '-';
                const items: any[] = Array.isArray(f.items) ? f.items : [];
                const shown = items.slice(0, 3);
                const extra = Math.max(0, items.length - shown.length);
                return (
                  <tr key={f._id} className="border-t border-white/10 text-white">
                    <td className="p-3">
                      {f.client ? (
                        <a href={`/fittings/${f._id}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                          {f.client.firstName} {f.client.lastName}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="p-3">{weddingDate}</td>
                    <td className="p-3">{date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        f.status === 'Confirmed' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                        f.status === 'Pending' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' :
                        f.status === 'Cancelled' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                        f.status === 'Reservé' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                        'bg-gray-500/15 text-gray-400 border border-gray-500/30'
                      }`}>
                        {t(`statuses.${f.status === 'Reservé' ? 'reserved' : f.status?.toLowerCase() || 'confirmed'}`)}
                      </span>
                    </td>
                    <td className="p-3">
                      {shown.length === 0 ? (
                        <span className="text-gray-400 text-sm">0</span>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                          {shown.map((it, idx) => {
                            const img = it?.primaryPhoto ? `/api/uploads/${it.primaryPhoto}` : '';
                            return (
                              <button
                                type="button"
                                key={it._id}
                                className="flex items-center gap-2 cursor-zoom-in"
                                onClick={() => setImagePreview({ open: true, items, index: idx })}
                                title="Preview"
                              >
                                {img ? (
                                  <img
                                    src={img}
                                    alt={it.name}
                                    className="h-8 w-8 rounded object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/file.svg'; }}
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded bg-gray-600 flex items-center justify-center text-[10px] text-gray-300">N/A</div>
                                )}
                                <span className="text-xs text-white truncate max-w-[120px]">{it.name}</span>
                              </button>
                            );
                          })}
                          {extra > 0 && (
                            <span className="text-xs text-gray-300">+{extra}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/fittings/${f._id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-gray-200"
                          title={t('list.actions.view')}
                        >
                          <EyeOpenIcon />
                        </a>
                        <a
                          href={`/fittings/${f._id}/edit`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-gray-200"
                          title={t('list.actions.edit')}
                        >
                          <Pencil1Icon />
                        </a>
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-50"
                          title={t('list.actions.delete')}
                          disabled={deletingId === f._id}
                          onClick={async () => {
                            if (!confirm(t('list.deleteConfirm'))) return;
                            try {
                              setDeletingId(f._id);
                              await axios.delete(`/api/fittings/${f._id}`);
                              setFittings((prev) => prev.filter((x) => x._id !== f._id));
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {isStatusDropdownOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setIsStatusDropdownOpen(false)}
        />
      )}

      {imagePreview.open && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setImagePreview({ open: false, items: [], index: 0 })}>
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900/95 border border-white/20 rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white" onClick={() => setImagePreview({ open: false, items: [], index: 0 })}>
              <Cross2Icon className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between h-full">
              <button
                className="p-3 text-white/80 hover:text-white disabled:opacity-30"
                onClick={() => setImagePreview((s) => ({ ...s, index: (s.index - 1 + s.items.length) % s.items.length }))}
                disabled={imagePreview.items.length <= 1}
                aria-label="Previous"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <div className="flex-1 flex items-center justify-center p-4">
                {(() => {
                  const current = imagePreview.items[imagePreview.index];
                  const src = current?.primaryPhoto ? `/api/uploads/${current.primaryPhoto}` : '/file.svg';
                  return (
                    <img src={src} alt={current?.name || ''} className="max-h-[75vh] max-w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/file.svg'; }} />
                  );
                })()}
              </div>
              <button
                className="p-3 text-white/80 hover:text-white disabled:opacity-30"
                onClick={() => setImagePreview((s) => ({ ...s, index: (s.index + 1) % s.items.length }))}
                disabled={imagePreview.items.length <= 1}
                aria-label="Next"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-3 border-t border-white/10 text-center text-white/90 text-sm truncate">
              {imagePreview.items[imagePreview.index]?.name || ''}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}

