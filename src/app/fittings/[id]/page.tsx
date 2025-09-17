'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { formatCurrency } from '@/utils/currency';
import { Pencil1Icon, EyeOpenIcon, Cross2Icon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';

interface Fitting {
  _id: string;
  type: string;
  client?: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    weddingDate?: string;
    idNumber?: string;
    type?: string;
  };
  items: Array<{
    _id: string;
    name: string;
    rentalCost?: number;
    category?: string | { _id: string; name: string };
    primaryPhoto?: string;
    size?: number;
  }>;
  pickupDate: string;
  returnDate: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export default function ViewFittingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const currencySettings = useSelector((s: RootState) => s.settings);
  const { t } = useTranslation('fittings');

  const [fitting, setFitting] = useState<Fitting | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ open: boolean; src: string; alt: string }>({ open: false, src: '', alt: '' });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/fittings/${id}`);
        const data = await res.json();
        if (data?.success) setFitting(data.fitting);
        else setError(data?.message || 'Failed to load');
      } catch (e) {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const formatIsoDateTime = (iso?: string) => {
    if (!iso) return '—';
    const dd = iso.substring(8, 10);
    const mm = iso.substring(5, 7);
    const yy = iso.substring(0, 4);
    const HH = iso.substring(11, 13);
    const MI = iso.substring(14, 16);
    return `${dd}/${mm}/${yy} ${HH}:${MI}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-300">Loading fitting...</div>
        </div>
      </Layout>
    );
  }

  if (error || !fitting) {
    return (
      <Layout>
        <div className="text-center text-red-400">
          <p>{error || 'Fitting not found'}</p>
          <Link href="/fittings" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Back to fittings</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{t('details.title')}</h1>
          <button onClick={() => router.push(`/fittings/${fitting._id}/edit`)} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
            <Pencil1Icon /> {t('details.editButton')}
          </button>
        </div>

        {/* Client */}
        {fitting.client && (
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <h4 className="text-white font-medium mb-3">{t('common.client')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-400">{t('common.name')}</div>
                <div className="text-white">{fitting.client.firstName} {fitting.client.lastName}</div>
              </div>
              <div>
                <div className="text-gray-400">{t('common.phone')}</div>
                <div className="text-white">{fitting.client.phone || '—'}</div>
              </div>
              <div>
                <div className="text-gray-400">{t('common.weddingDate')}</div>
                <div className="text-white">{fitting.client.weddingDate ? formatIsoDateTime(fitting.client.weddingDate) : '—'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Fitting Date */}
        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
          <h4 className="text-white font-medium mb-3">{t('details.fittingSection')}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">{t('common.fittingDateTime')}</div>
              <div className="text-white">{formatIsoDateTime(fitting.pickupDate)}</div>
            </div>
            <div>
              <div className="text-gray-400">{t('common.status')}</div>
              <div className="text-white">{t(`statuses.${fitting.status === 'Reservé' ? 'reserved' : String(fitting.status).toLowerCase()}`)}</div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
          <h4 className="text-white font-medium mb-3">{t('common.items')}</h4>
          {fitting.items?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fitting.items.map((it) => (
                <div key={it._id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  {it.primaryPhoto ? (
                    <div className="relative w-full mb-2">
                      <div className="relative w-full aspect-square sm:aspect-[3/4] bg-gray-800 rounded">
                        <img
                          src={`/api/uploads/${it.primaryPhoto}`}
                          alt={it.name}
                          className="absolute inset-0 w-full h-full object-contain rounded"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/file.svg'; }}
                        />
                        <button
                          type="button"
                          className="absolute top-2 left-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded"
                          onClick={() => setImagePreview({ open: true, src: `/api/uploads/${it.primaryPhoto}`, alt: it.name })}
                          title="Preview"
                        >
                          <EyeOpenIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full mb-2">
                      <div className="relative w-full aspect-square sm:aspect-[3/4] bg-gray-700 rounded flex items-center justify-center text-gray-300 text-sm">No Image</div>
                    </div>
                  )}
                  <div className="text-white font-medium text-sm truncate">{it.name}</div>
                  <div className="text-xs text-gray-300 mt-1">{formatCurrency(it.rentalCost || 0, currencySettings)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-300 text-sm">{t('details.noItems')}</div>
          )}
        </div>

        {/* Notes */}
        {fitting.notes && (
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <h4 className="text-white font-medium mb-3">{t('common.notes')}</h4>
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{fitting.notes}</p>
          </div>
        )}

        {/* Image Modal */}
        {imagePreview.open && (
          <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setImagePreview({ open: false, src: '', alt: '' })}>
            <div className="bg-gray-900/95 border border-white/20 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-3 border-b border-white/10">
                <div className="text-white text-sm font-medium truncate">{imagePreview.alt}</div>
                <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white" onClick={() => setImagePreview({ open: false, src: '', alt: '' })}>
                  <Cross2Icon className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3">
                <img src={imagePreview.src} alt={imagePreview.alt} className="w-full max-h-[75vh] object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).src = '/file.svg'; }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

