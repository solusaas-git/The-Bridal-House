'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, CheckIcon, Cross2Icon, CalendarIcon } from '@radix-ui/react-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { formatCurrency } from '@/utils/currency';
import { EyeOpenIcon } from '@radix-ui/react-icons';

export default function NewFittingPage() {
	const router = useRouter();
	const currencySettings = useSelector((s: RootState) => s.settings);
	const { t } = useTranslation('fittings');

	// Data
	const [customers, setCustomers] = useState<any[]>([]);
	const [products, setProducts] = useState<any[]>([]);
	const [reservations, setReservations] = useState<any[]>([]);

	// Step state
	const [step, setStep] = useState<number>(1);

	// Client selection
	const [selectedClient, setSelectedClient] = useState<any>(null);
	const [clientSearch, setClientSearch] = useState('');
	const [showClientDropdown, setShowClientDropdown] = useState(false);
	const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
	const [searchLoading, setSearchLoading] = useState(false);

	// Fitting date/time
	const [fittingDate, setFittingDate] = useState('');
	const [fittingTime, setFittingTime] = useState('15:00');
	const [notes, setNotes] = useState('');
	const [status, setStatus] = useState<'Confirmed' | 'Pending' | 'Cancelled'>('Confirmed');

	// Items selection
	const [selectedItems, setSelectedItems] = useState<any[]>([]);
	const [itemSearchTerm, setItemSearchTerm] = useState('');
	const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
	const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'booked'>('all');

	// Image preview on hover
	const [imagePopup, setImagePopup] = useState<{ show: boolean; src: string; alt: string; x: number; y: number; isModal?: boolean }>({ show: false, src: '', alt: '', x: 0, y: 0, isModal: false });
	const handleImageHover = (event: React.MouseEvent, src: string, alt: string) => {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		setImagePopup({ show: true, src, alt, x: rect.right + 10, y: rect.top, isModal: false });
	};
	const handleImageLeave = () => setImagePopup((prev) => ({ ...prev, show: false }));
	const openImageModal = (src: string, alt: string) => setImagePopup({ show: true, src, alt, x: 0, y: 0, isModal: true });
	const closeImageModal = () => setImagePopup({ show: false, src: '', alt: '', x: 0, y: 0, isModal: false });

	// Load base data
	useEffect(() => {
		(async () => {
			const [c, p, r] = await Promise.all([
				axios.get('/api/customers', { params: { limit: 1000 } }),
				axios.get('/api/products', { params: { limit: 1000 } }),
				axios.get('/api/reservations', { params: { limit: 1000 } }),
			]);
			const allCustomers = c.data?.customers || c.data || [];
			setCustomers(allCustomers.filter((x: any) => x.type === 'Prospect'));
			setProducts(p.data?.products || []);
			setReservations(r.data?.reservations || []);
		})();
	}, []);

	// Client search debounce
	useEffect(() => {
		const handler = setTimeout(async () => {
			const term = clientSearch.trim();
			// If a prospect is selected and search equals their name, hide dropdown
			if (selectedClient && term === `${selectedClient.firstName} ${selectedClient.lastName}`) {
				setFilteredCustomers([]);
				setShowClientDropdown(false);
				return;
			}
			if (term.length < 2) {
				setFilteredCustomers([]);
				setShowClientDropdown(false);
				return;
			}
			try {
				setSearchLoading(true);
				const res = await axios.get('/api/customers', { params: { search: term, limit: 10 } });
				const list = res.data?.customers || [];
				const prospects = list.filter((x: any) => x.type === 'Prospect');
				setFilteredCustomers(prospects);
				setShowClientDropdown(prospects.length > 0 || searchLoading);
			} finally {
				setSearchLoading(false);
			}
		}, 300);
		return () => clearTimeout(handler);
	}, [clientSearch, selectedClient]);

	const getCategories = useCallback(() => {
		const set = new Set<string>();
		products.forEach((p: any) => {
			const name = typeof p.category === 'object' && p.category?.name ? p.category.name : p.category;
			if (name) set.add(name);
		});
		return Array.from(set);
	}, [products]);

	// Availability: in fittings, product unavailable only if booked for a reservation on the same wedding date
	const isItemAvailable = useCallback((product: any) => {
		if (!fittingDate) return true;
		const selected = new Date(fittingDate);
		selected.setHours(0, 0, 0, 0);
		return !reservations?.some((res: any) => {
			if (res.status === 'Cancelled') return false;
			if (!res.items) return false;
			const has = res.items.some((it: any) => (typeof it === 'string' ? it : it?._id) === product._id);
			if (!has) return false;
			const weddingIso = res?.client?.weddingDate ? String(res.client.weddingDate) : null;
			const returnIso = res?.returnDate ? String(res.returnDate) : null;
			if (!weddingIso || !returnIso) return false;
			const start = new Date(weddingIso);
			start.setHours(0, 0, 0, 0);
			const end = new Date(returnIso);
			end.setHours(23, 59, 59, 999);
			return selected >= start && selected <= end;
		});
	}, [fittingDate, reservations]);

	const getFilteredProducts = useCallback(() => {
		return products.filter((product: any) => {
			const available = isItemAvailable(product);
			// Category filter
			const matchesCategory = selectedCategoryTab === 'all' || (() => {
				const cat = typeof product.category === 'object' && product.category?.name ? product.category.name : product.category;
				return cat === selectedCategoryTab;
			})();
			// Search filter
			const matchesSearch = !itemSearchTerm ||
				product.name?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
				(() => {
					const cat = typeof product.category === 'object' && product.category?.name ? product.category.name : product.category;
					return (cat || '').toString().toLowerCase().includes(itemSearchTerm.toLowerCase());
				})();
			// Availability filter
			const matchesAvailability = availabilityFilter === 'all' || (availabilityFilter === 'available' && available) || (availabilityFilter === 'booked' && !available);
			return matchesCategory && matchesSearch && matchesAvailability;
		});
	}, [products, selectedCategoryTab, itemSearchTerm, isItemAvailable, availabilityFilter]);

	const filteredProducts = useMemo(() => getFilteredProducts(), [getFilteredProducts]);

	const handleItemToggle = (product: any) => {
		const available = isItemAvailable(product);
		if (!available) return;
		const exists = selectedItems.some((it) => it._id === product._id);
		if (exists) {
			setSelectedItems((prev) => prev.filter((it) => it._id !== product._id));
		} else {
			setSelectedItems((prev) => [...prev, product]);
		}
	};

	const handleSubmit = async () => {
		if (!selectedClient) return;
		if (!fittingDate) return;
		try {
			await axios.post('/api/fittings', {
				client: selectedClient._id,
				items: selectedItems.map((it) => it._id),
				fittingDate,
				fittingTime,
				status,
				notes,
			});
			router.push('/fittings');
		} catch (e) {
			// no-op
		}
	};

	const validateStep = (s: number) => {
		switch (s) {
			case 1:
				return !!selectedClient;
			case 2:
				return !!fittingDate && selectedItems.length > 0;
			default:
				return false;
		}
	};

	return (
		<Layout>
			<div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-white">{t('create.title')}</h1>
					<a href="/fittings" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300">{t('common.close')}</a>
				</div>

				{/* Step indicator */}
				<div className="hidden sm:flex items-center justify-center gap-0">
					{[
						{ number: 1, title: t('create.steps.clientSelection') },
						{ number: 2, title: t('create.steps.itemsAndDate') },
					].map((s, idx) => (
						<div key={s.number} className="flex items-center">
							<div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-colors ${
								step >= s.number ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-white/10 text-white/70 border border-white/20'
							}`}> {step > s.number ? <CheckIcon className="w-5 h-5" /> : s.number} </div>
							<div className="ml-2 text-sm font-medium text-white">{s.title}</div>
							{idx < 1 && <div className="mx-4 w-8 h-px bg-white/30" />}
						</div>
					))}
				</div>

				<div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-4 sm:p-6">
					{step === 1 && (
						<div className="space-y-6">
							<h3 className="text-lg font-medium text-white">{t('create.selectClient')}</h3>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<MagnifyingGlassIcon className="h-5 w-5 text-white/50" />
								</div>
								<input
									type="text"
									placeholder={t('create.searchCustomersPlaceholder') as string}
									value={clientSearch}
									onChange={(e) => setClientSearch(e.target.value)}
									className="block w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
								/>
								{/* Dropdown */}
								{showClientDropdown && (
									<div className="absolute z-10 mt-1 w-full bg-gray-900/95 backdrop-blur-lg border border-white/20 shadow-xl max-h-60 rounded-lg py-1 text-base overflow-auto">
										{searchLoading ? (
											<div className="px-4 py-3 text-center text-gray-400">{t('common.searching')}</div>
										) : filteredCustomers.length === 0 ? (
											<div className="px-4 py-3 text-center text-gray-400">{t('common.noCustomers')}</div>
										) : (
											filteredCustomers.map((c) => (
												<div key={c._id} onClick={() => { setSelectedClient(c); setClientSearch(`${c.firstName} ${c.lastName}`); setShowClientDropdown(false); }} className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-white/10 transition-colors">
													<div className="text-white font-medium">{c.firstName} {c.lastName}</div>
													<div className="text-sm text-white/50">{c.phone} • {c.type}</div>
												</div>
											))
										)}
									</div>
								)}
							</div>

							{/* Selected client card */}
							{selectedClient && (
								<div className="bg-white/5 border border-white/10 p-4 rounded-lg flex items-start justify-between">
									<div>
										<div className="text-white text-lg font-medium">{selectedClient.firstName} {selectedClient.lastName}</div>
										<div className="text-sm text-gray-400">{selectedClient.phone} • {selectedClient.type}</div>
									</div>
									<button onClick={() => { setSelectedClient(null); setClientSearch(''); }} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Clear selection">
										<Cross2Icon className="h-4 w-4" />
									</button>
								</div>
							)}
						</div>
					)}

					{step === 2 && (
						<div className="space-y-6">
							<h3 className="text-lg font-medium text-white">{t('create.itemsAndDate')}</h3>
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								{/* Fitting date/time */}
								<div className="bg-white/5 rounded-lg p-4 border border-white/10 order-2 lg:order-1">
									<div className="text-center mb-3">
										<p className="text-xs text-gray-400 mb-1">{t('create.fittingDate')}</p>
										<p className="text-base font-medium text-blue-400">{fittingDate ? new Date(fittingDate).toLocaleDateString('en-GB') : '—'}</p>
									</div>
									<div className="space-y-3">
										<label className="block text-xs font-medium text-gray-300 text-center">{t('create.fittingTime')} *</label>
										<div className="relative">
											<CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
											<input type="time" value={fittingTime} onChange={(e) => setFittingTime(e.target.value)} className="w-full pl-8 pr-2.5 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-sm" />
										</div>
										<label className="block text-xs font-medium text-gray-300 text-center">{t('create.pickDate')} *</label>
										<div className="relative">
											<CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
											<input type="date" value={fittingDate} onChange={(e) => setFittingDate(e.target.value)} className="w-full pl-8 pr-2.5 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-sm" />
										</div>
										<label className="block text-xs font-medium text-gray-300 text-center">{t('common.status')}</label>
										<select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
											<option value="Confirmed" className="bg-gray-800">{t('statuses.confirmed')}</option>
											<option value="Pending" className="bg-gray-800">{t('statuses.pending')}</option>
											<option value="Cancelled" className="bg-gray-800">{t('statuses.cancelled')}</option>
										</select>
										<label className="block text-xs font-medium text-gray-300 text-center">{t('common.notes')}</label>
										<textarea
											value={notes}
											onChange={(e) => setNotes(e.target.value)}
											rows={4}
											placeholder={t('common.optionalNotes') as string}
											className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
										/>
									</div>
								</div>

								{/* Items */}
								<div className="lg:col-span-2 order-1 lg:order-2">
									{/* Category tabs */}
									<div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 mb-3">
										<div className="flex gap-2 min-w-max sm:flex-wrap">
											<button onClick={() => setSelectedCategoryTab('all')} className={`px-3 py-2 sm:px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${selectedCategoryTab === 'all' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'}`}>All ({filteredProducts.length})</button>
											{getCategories().map((c) => (
												<button key={c} onClick={() => setSelectedCategoryTab(c)} className={`px-3 py-2 sm:px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${selectedCategoryTab === c ? 'bg-blue-500 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'}`}>{c}</button>
											))}
										</div>
									</div>

									{/* Item search */}
									<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3">
										<div className="relative w-full sm:flex-1">
											<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
											<input type="text" value={itemSearchTerm} onChange={(e) => setItemSearchTerm(e.target.value)} placeholder={t('create.searchItemsPlaceholder') as string} className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
										</div>
										<div className="flex items-center gap-2">
											<label className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap">{t('filters.availability.label')}</label>
											<select
												value={availabilityFilter}
												onChange={(e) => setAvailabilityFilter(e.target.value as any)}
												className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
											>
												<option value="all" className="bg-gray-800">{t('filters.availability.all')}</option>
												<option value="available" className="bg-gray-800">{t('filters.availability.available')}</option>
												<option value="booked" className="bg-gray-800">{t('filters.availability.booked')}</option>
											</select>
										</div>
									</div>

									{/* Grid */}
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-auto">
										{filteredProducts.map((p: any) => {
											const available = isItemAvailable(p);
											const isSelected = selectedItems.some((it) => it._id === p._id);
											const imgSrc = p.primaryPhoto ? `/api/uploads/${p.primaryPhoto}` : '';
											const borderClass = isSelected ? 'border-blue-500' : (available ? 'border-green-500' : 'border-red-500');
											return (
												<div key={p._id} className={`relative rounded-lg border-2 ${borderClass} ${isSelected ? 'ring-2 ring-blue-500' : ''} overflow-hidden group ${available ? 'cursor-pointer' : 'cursor-not-allowed'} transition-all`} onClick={() => handleItemToggle(p)}>
													<div className="p-3">
														{/* Thumbnail */}
														{imgSrc ? (
															<div className="relative">
																<img
																	src={imgSrc}
																	alt={p.name}
																	className="w-full h-28 object-cover rounded-md mb-2"
																	onMouseEnter={(e) => handleImageHover(e, imgSrc, p.name)}
																	onMouseLeave={handleImageLeave}
																	onError={(e) => {
																		const target = e.target as HTMLImageElement;
																		target.style.display = 'none';
																	}}
																/>
																<button
																	type="button"
																	className="absolute top-2 left-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md"
																	onClick={(e) => { e.stopPropagation(); openImageModal(imgSrc, p.name); }}
																	title={t('common.preview') as string}
																>
																	<EyeOpenIcon className="w-4 h-4" />
																</button>
															</div>
														) : null}
														<div className="text-white font-medium text-sm truncate">{p.name}</div>
														<div className="text-xs text-gray-300 mt-1">{formatCurrency(p.rentalCost || 0, currencySettings)}</div>
														<div className="mt-1 text-xs">
															{available ? (
																<span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">{t('badges.available')}</span>
															) : (
																<span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">{t('badges.booked')}</span>
															)}
														</div>
													</div>
													{isSelected && (
														<div className="absolute top-2 right-2">
															<CheckIcon className="w-5 h-5 text-white bg-blue-500 rounded-full p-1" />
														</div>
													)}
												</div>
											);
										})}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Navigation buttons */}
					<div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-6 pt-4 border-t border-white/10">
						<button type="button" onClick={() => setStep(Math.max(1, step - 1))} className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors w-full sm:w-auto ${step === 1 ? 'invisible' : 'bg-white/10 hover:bg-white/20'}`}>{t('common.previous')}</button>
						{step === 2 ? (
							<button type="button" onClick={handleSubmit} disabled={!validateStep(step)} className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors w-full sm:w-auto bg-blue-500 hover:bg-blue-600 disabled:opacity-50">{t('create.submit')}</button>
						) : (
							<button type="button" onClick={() => setStep(step + 1)} disabled={!validateStep(step)} className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors w-full sm:w-auto bg-blue-500 hover:bg-blue-600 disabled:opacity-50">{t('common.next')}</button>
						)}
					</div>
				</div>
			</div>

			{/* Image Popup */}
			{imagePopup.show && !imagePopup.isModal && typeof window !== 'undefined' && (
				<div
					className="fixed pointer-events-none z-[9999]"
					style={{ left: `${imagePopup.x}px`, top: `${imagePopup.y}px`, transform: 'translateY(-50%)' }}
				>
					<div className="bg-gray-900/95 backdrop-blur-lg border border-white/20 rounded-lg p-2 shadow-2xl">
						<img src={imagePopup.src} alt={imagePopup.alt} className="w-64 h-48 object-cover rounded-lg" />
						<div className="mt-2 text-xs text-white/80 text-center truncate">{imagePopup.alt}</div>
					</div>
				</div>
			)}

			{/* Image Modal (for mobile or when clicking preview) */}
			{imagePopup.show && imagePopup.isModal && (
				<div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeImageModal}>
					<div className="bg-gray-900/95 border border-white/20 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between p-3 border-b border-white/10">
							<div className="text-white text-sm font-medium truncate">{imagePopup.alt}</div>
							<button className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white" onClick={closeImageModal}>
								<Cross2Icon className="w-4 h-4" />
							</button>
						</div>
						<div className="p-3">
							<img src={imagePopup.src} alt={imagePopup.alt} className="w-full max-h-[70vh] object-contain rounded" />
						</div>
					</div>
				</div>
			)}
		</Layout>
	);
}

