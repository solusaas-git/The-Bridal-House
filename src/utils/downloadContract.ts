import jsPDF from 'jspdf';
import { formatCurrency } from './currency';

// Page margins constants
const LEFT_MARGIN = 20;
const RIGHT_MARGIN = 20;
const PAGE_WIDTH = 210; // A4 width in mm
const USABLE_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;

// Helper function to wrap text within margins
const wrapText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5): number => {
  const words = text.split(' ');
  let currentLine = '';
  let currentY = y;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
    const testWidth = doc.getTextWidth(testLine);
    
    if (testWidth > maxWidth && currentLine !== '') {
      doc.text(currentLine, x, currentY);
      currentLine = words[i];
      currentY += lineHeight;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    doc.text(currentLine, x, currentY);
    currentY += lineHeight;
  }
  
  return currentY;
};

// Helper function to render the products table
const renderProductsTable = (
  doc: jsPDF, 
  items: any[], 
  currencySettings: any,
  totalAmount: number,
  tableStartY: number = 178
) => {
  const rowHeight = 6;
  const col1X = LEFT_MARGIN;  // Article/Category column
  const col2X = LEFT_MARGIN + 65;  // Product Name column  
  const col3X = LEFT_MARGIN + 130; // Montant column
  
  // Calculate number of rows needed (header + items + padding)
  const totalRows = Math.max(items.length + 1, 6); // At least 6 rows including header
  
  // Table borders
  doc.rect(col1X, tableStartY, USABLE_WIDTH, rowHeight * totalRows); // Outer border
  doc.line(col2X, tableStartY, col2X, tableStartY + (rowHeight * totalRows)); // Column 1-2 separator
  doc.line(col3X, tableStartY, col3X, tableStartY + (rowHeight * totalRows)); // Column 2-3 separator
  
  // Horizontal lines for each row
  for (let i = 1; i < totalRows; i++) {
    doc.line(col1X, tableStartY + (rowHeight * i), col1X + USABLE_WIDTH, tableStartY + (rowHeight * i));
  }
  
  // Table headers
  doc.setFont('helvetica', 'bold');
  doc.text('Article', col1X + 2, tableStartY + 5);
  doc.text('Référence / Nom du modèle', col2X + 2, tableStartY + 5);
  doc.text('Montant (Dhs)', col3X + 2, tableStartY + 5);
  
  // Table content - actual reservation items
  doc.setFont('helvetica', 'normal');
  
  // Sort items: Robe categories first, then others
  const sortedItems = [...items].sort((a, b) => {
    const getCategoryName = (item: any) => {
      if (typeof item.category === 'object' && item.category?.name) {
        return item.category.name.toLowerCase();
      } else if (typeof item.category === 'string') {
        return item.category.toLowerCase();
      }
      return 'zzz'; // Put unknown categories at the end
    };
    
    const categoryA = getCategoryName(a);
    const categoryB = getCategoryName(b);
    
    // If one contains "robe" and the other doesn't, robe goes first
    const aIsRobe = categoryA.includes('robe');
    const bIsRobe = categoryB.includes('robe');
    
    if (aIsRobe && !bIsRobe) return -1;
    if (!aIsRobe && bIsRobe) return 1;
    
    // Otherwise, sort alphabetically
    return categoryA.localeCompare(categoryB);
  });
  
  sortedItems.forEach((item, index) => {
    const rowY = tableStartY + (rowHeight * (index + 1)) + 5;
    
    // Category/Article name
    let categoryName = '';
    if (typeof item.category === 'object' && item.category?.name) {
      categoryName = item.category.name;
    } else if (typeof item.category === 'string') {
      categoryName = item.category;
    } else {
      categoryName = 'Article';
    }
    
    doc.text(categoryName, col1X + 2, rowY);
    
    // Product name
    doc.text(item.name || '', col2X + 2, rowY);
    
    // Amount - check if it's an accessory category
    const isAccessory = categoryName.toLowerCase().includes('accessoire') || 
                       categoryName.toLowerCase().includes('voile') ||
                       categoryName.toLowerCase().includes('parure') ||
                       categoryName.toLowerCase().includes('bouquet') ||
                       !categoryName.toLowerCase().includes('robe');
    
    if (isAccessory && !categoryName.toLowerCase().includes('robe')) {
      doc.text('Offert avec la robe', col3X + 2, rowY);
    } else if (categoryName.toLowerCase().includes('robe')) {
      // For dress items, use the total amount (same as "Montant de la location")
      doc.text(formatCurrency(totalAmount, { settings: currencySettings.settings }), col3X + 2, rowY);
    } else {
      const amount = item.rentalCost || 0;
      doc.text(formatCurrency(amount, { settings: currencySettings.settings }), col3X + 2, rowY);
    }
  });
  
  // If we have fewer items than minimum rows, fill remaining rows with accessories
  const accessories = [
    { name: 'Parure', price: 'Offert avec la robe' },
    { name: 'Voile', price: 'Offert avec la robe' },
    { name: 'Bouquet', price: 'Offert avec la robe' }
  ];
  
  let currentRow = sortedItems.length + 1;
  accessories.forEach((accessory) => {
    if (currentRow < totalRows) {
      const rowY = tableStartY + (rowHeight * currentRow) + 5;
      doc.text('Accessoire', col1X + 2, rowY);
      doc.text(accessory.name, col2X + 2, rowY);
      doc.text(accessory.price, col3X + 2, rowY);
      currentRow++;
    }
  });
  
  // Fill any remaining empty rows
  while (currentRow < totalRows) {
    const rowY = tableStartY + (rowHeight * currentRow) + 5;
    doc.text('', col1X + 2, rowY);
    doc.text('', col2X + 2, rowY);
    doc.text('', col3X + 2, rowY);
    currentRow++;
  }
  
  // Return the Y position where the table ends
  return tableStartY + (rowHeight * totalRows) + 6; // Add 6 for spacing
};

interface Reservation {
  _id: string;
  type: string;
  client?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    weddingDate?: string;
    weddingTime?: string;
    weddingCity?: string;
    weddingLocation?: string;
    address?: string;
    idNumber?: string;
  };
  items: Array<{
    _id: string;
    name: string;
    rentalCost: number;
    category: string | { _id: string; name: string };
    primaryPhoto?: string;
    size?: number;
  }>;
  pickupDate: string;
  returnDate: string;
  status: 'Draft' | 'Confirmed' | 'Cancelled';
  total: number;
  itemsTotal: number;
  subtotal: number;
  additionalCost: number;
  securityDepositAmount: number;
  advanceAmount: number;
  securityDepositPercentage?: number;
  advancePercentage?: number;
  notes?: string;
  createdAt: string;
}

export const handleDownloadWeddingDressRentalContract = async (
  reservation: Reservation, 
  currencySettings: any = {}
) => {
  const doc = new jsPDF();
  
  // Handle client data
  const clientDetails = reservation.client;
  
  // Extract client information with fallbacks
  const clientName = clientDetails?.firstName || '';
  const clientSurname = clientDetails?.lastName || '';
  const clientAddress = clientDetails?.address || '';
  const clientIdNumber = clientDetails?.idNumber || '';
  const weddingDate = clientDetails?.weddingDate ? 
    new Date(clientDetails.weddingDate).toLocaleDateString('fr-FR') : '';
  const weddingCity = clientDetails?.weddingCity || '';
  
  // Calculate financial details
  const items = reservation.items || [];
  const itemsTotal = reservation.itemsTotal || items.reduce(
    (sum, item) => sum + (item.rentalCost || 0),
    0
  );

  const additionalCost = reservation.additionalCost || 0;
  const subtotal = reservation.subtotal || (itemsTotal + additionalCost);
  
  const advancePercentage = reservation.advancePercentage || 50;
  const securityDepositPercentage = reservation.securityDepositPercentage || 30;
  
  const advanceAmount = reservation.advanceAmount || 
    ((subtotal * advancePercentage) / 100);
  const securityDepositAmount = reservation.securityDepositAmount || 
    ((subtotal * securityDepositPercentage) / 100);
  
  const totalAmount = reservation.total || subtotal;
  
  // Format dates
  const pickupDate = reservation.pickupDate ? 
    new Date(reservation.pickupDate).toLocaleDateString('fr-FR') : '';
  const returnDate = reservation.returnDate ? 
    new Date(reservation.returnDate).toLocaleDateString('fr-FR') : '';

  // Load signature image
  let signatureImage: string | null = null;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        signatureImage = canvas.toDataURL('image/png');
        resolve();
      };
      img.onerror = reject;
      img.src = '/bridal signiture-BVuoc_JI.png';
    });
  } catch (error) {
    console.warn('Could not load signature image:', error);
  }

  // EXACT TEXT FROM YOUR DOCUMENT - NO MODIFICATIONS
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Contrat de Location de Robes de Mariée avec Accessoires', LEFT_MARGIN, 20);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Entre :', LEFT_MARGIN, 35);
  let currentY = wrapText(doc, 'The Bridal House, spécialisée dans la location de robes de mariée, dont le siège est situé à 11 RUE CHAKIB ARRSALANE MAGASIN 2 V.N. Fès Maroc, représentée par Hajar Choukri,', LEFT_MARGIN, 43, USABLE_WIDTH);
  doc.text('ci-après dénommée "Le Loueur".', LEFT_MARGIN, currentY);
  currentY += 5;

  doc.text('Et :', LEFT_MARGIN, currentY + 2);
  currentY += 7;
  currentY = wrapText(doc, `Madame ${clientName} ${clientSurname}, demeurant à ${clientAddress}, titulaire de la CIN N°${clientIdNumber}, ci-après dénommé(e) "Le Locataire".`, LEFT_MARGIN, currentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.text('Objet du contrat :', LEFT_MARGIN, currentY + 8);
  currentY += 14;
  doc.setFont('helvetica', 'normal');
  currentY = wrapText(doc, 'La présente convention a pour objet la location d\'une robe de mariée ainsi que des accessoires par The Bridal House, selon les termes et conditions ci-dessous.', LEFT_MARGIN, currentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('1. Détails du Mariage :', LEFT_MARGIN, currentY + 8);
  doc.setTextColor(0, 0, 0); // Reset to black
  currentY += 14;
  doc.setFont('helvetica', 'normal');
  doc.text(`• Ville du mariage : ${weddingCity}`, LEFT_MARGIN + 5, currentY);
  currentY += 5;
  doc.text(`• Date du mariage : ${weddingDate}`, LEFT_MARGIN + 5, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('2. Liste des articles loués :', LEFT_MARGIN, currentY + 3);
  doc.setTextColor(0, 0, 0); // Reset to black
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  
  // Render products table with actual reservation items
  const tableEndY = renderProductsTable(doc, items, currencySettings, totalAmount, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('3. Paiement et conditions :', LEFT_MARGIN, tableEndY + 4);
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.setFont('helvetica', 'normal');
  doc.text(`• Montant de la location : ${formatCurrency(totalAmount, { settings: currencySettings.settings })}`, LEFT_MARGIN + 5, tableEndY + 9);
  doc.text(`• Acompte : ${formatCurrency(advanceAmount, { settings: currencySettings.settings })}`, LEFT_MARGIN + 5, tableEndY + 14);
  doc.text(`• Dépôt de garantie : ${formatCurrency(securityDepositAmount, { settings: currencySettings.settings })}`, LEFT_MARGIN + 5, tableEndY + 19);
  doc.text('Cette caution est remboursable sous réserve des conditions d\'utilisation ci-après.', LEFT_MARGIN, tableEndY + 24);

  doc.addPage();
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('4. Durée de location :', LEFT_MARGIN, 20);
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.setFont('helvetica', 'normal');
  doc.text('La durée de location est de 24 heures.', LEFT_MARGIN, 28);
  let pageCurrentY = wrapText(doc, 'Pour les clientes hors Fès, la durée maximale est de 72 heures.', LEFT_MARGIN, 36, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Tout retard donne droit au Loueur de retenir la totalité ou une partie de la caution, en fonction de l\'impact du retard sur la préparation des articles pour la cliente suivante.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Il est impératif de respecter l\'horaire de retour afin de garantir un service optimal.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('5. Responsabilité en cas de dommages :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  pageCurrentY = wrapText(doc, 'En cas de dommage ou d\'altération d\'un ou plusieurs articles, le dépôt de garantie ne sera pas remboursé « Partiellement ou Totalement ».', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Le Loueur se réserve le droit de facturer des frais supplémentaires en fonction de l\'étendue des dommages.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('6. Entretien, lavage et réparation :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  pageCurrentY = wrapText(doc, 'Toute intervention de nettoyage, tentative de lavage ou de réparation des articles loués par le Locataire est strictement interdite.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Ces prestations sont exclusivement prises en charge par The Bridal House.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('7. Dates importantes :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  doc.text(`• Date et heure de retrait : ${pickupDate}`, LEFT_MARGIN + 5, pageCurrentY);
  pageCurrentY += 5;
  doc.text(`• Date et heure de retour : ${returnDate}`, LEFT_MARGIN + 5, pageCurrentY);
  pageCurrentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('8. Inspection au retour des articles :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  pageCurrentY = wrapText(doc, 'À la restitution, une inspection minutieuse est obligatoire.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Le Loueur se réserve un délai minimum de 30 minutes pour cette vérification.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Si le Locataire est pressé ou ne peut patienter, il devra revenir ultérieurement pour récupérer sa caution.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('9. Partage de contenu sur les réseaux sociaux :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  pageCurrentY = wrapText(doc, 'Le Loueur demande l\'autorisation de partager des photos de la mariée portant les articles loués sur ses réseaux sociaux à des fins promotionnelles.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  doc.text('Merci de cocher une option :', LEFT_MARGIN, pageCurrentY);
  pageCurrentY += 5;
  pageCurrentY = wrapText(doc, '[ ] Oui, j\'autorise le partage des photos.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, '[ ] Oui, j\'autorise le partage des photos mais sans montrer mon visage.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, '[ ] Non, je n\'autorise pas le partage des photos.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('10. Acceptation des conditions :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  pageCurrentY = wrapText(doc, 'En signant ce contrat, le Locataire reconnaît avoir pris connaissance des termes et s\'engage à les respecter.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  
  // Add line break and date before signature table
  pageCurrentY += 8;
  doc.text(`Fait à Fès, le ${new Date().toLocaleDateString('fr-FR')}`, LEFT_MARGIN, pageCurrentY);

  // Create signature table
  const signatureTableY = pageCurrentY + 8;
  const headerRowHeight = 12; // Compact header
  const signatureRowHeight = 35; // More space for signatures
  const col1Width = USABLE_WIDTH / 2;
  const col2Width = USABLE_WIDTH / 2;
  
  // Table border
  doc.rect(LEFT_MARGIN, signatureTableY, USABLE_WIDTH, headerRowHeight + signatureRowHeight);
  
  // Column separator
  doc.line(LEFT_MARGIN + col1Width, signatureTableY, LEFT_MARGIN + col1Width, signatureTableY + headerRowHeight + signatureRowHeight);
  
  // Row separator (between header and signature rows)
  doc.line(LEFT_MARGIN, signatureTableY + headerRowHeight, LEFT_MARGIN + USABLE_WIDTH, signatureTableY + headerRowHeight);
  
  // Table headers - compact
  doc.setFont('helvetica', 'bold');
  doc.text('Le Loueur', LEFT_MARGIN + (col1Width / 2) - 15, signatureTableY + 8);
  doc.text('Le Locataire', LEFT_MARGIN + col1Width + (col2Width / 2) - 20, signatureTableY + 8);
  
  // Signature content
  doc.setFont('helvetica', 'normal');
  doc.text('Signature :', LEFT_MARGIN + 5, signatureTableY + headerRowHeight + 10);
  doc.text(`Signature : ${clientName} ${clientSurname}`, LEFT_MARGIN + col1Width + 5, signatureTableY + headerRowHeight + 10);
  
  // Add signature image if available - within table bounds
  if (signatureImage) {
    doc.addImage(signatureImage, 'PNG', LEFT_MARGIN + 5, signatureTableY + headerRowHeight + 8, 50, 25);
  }

  doc.save(`${clientName}_${clientSurname}_${weddingDate.replace(/\//g, '-')}_contrat_location_robe_mariee.pdf`);
};

export const handlePreviewWeddingDressRentalContract = async (
  reservation: Reservation, 
  currencySettings: any = {}
) => {
  const doc = new jsPDF();
  
  // Handle client data
  const clientDetails = reservation.client;
  
  // Extract client information with fallbacks
  const clientName = clientDetails?.firstName || '';
  const clientSurname = clientDetails?.lastName || '';
  const clientAddress = clientDetails?.address || '';
  const clientIdNumber = clientDetails?.idNumber || '';
  const weddingDate = clientDetails?.weddingDate ? 
    new Date(clientDetails.weddingDate).toLocaleDateString('fr-FR') : '';
  const weddingCity = clientDetails?.weddingCity || '';
  
  // Calculate financial details
  const items = reservation.items || [];
  const itemsTotal = reservation.itemsTotal || items.reduce(
    (sum, item) => sum + (item.rentalCost || 0),
    0
  );

  const additionalCost = reservation.additionalCost || 0;
  const subtotal = reservation.subtotal || (itemsTotal + additionalCost);
  
  const advancePercentage = reservation.advancePercentage || 50;
  const securityDepositPercentage = reservation.securityDepositPercentage || 30;
  
  const advanceAmount = reservation.advanceAmount || 
    ((subtotal * advancePercentage) / 100);
  const securityDepositAmount = reservation.securityDepositAmount || 
    ((subtotal * securityDepositPercentage) / 100);
  
  const totalAmount = reservation.total || subtotal;
  
  // Format dates
  const pickupDate = reservation.pickupDate ? 
    new Date(reservation.pickupDate).toLocaleDateString('fr-FR') : '';
  const returnDate = reservation.returnDate ? 
    new Date(reservation.returnDate).toLocaleDateString('fr-FR') : '';

  // Load signature image
  let signatureImage: string | null = null;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        signatureImage = canvas.toDataURL('image/png');
        resolve();
      };
      img.onerror = reject;
      img.src = '/bridal signiture-BVuoc_JI.png';
    });
  } catch (error) {
    console.warn('Could not load signature image:', error);
  }

  // EXACT TEXT FROM YOUR DOCUMENT - NO MODIFICATIONS
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Contrat de Location de Robes de Mariée avec Accessoires', LEFT_MARGIN, 20);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Entre :', LEFT_MARGIN, 35);
  let currentY = wrapText(doc, 'The Bridal House, spécialisée dans la location de robes de mariée, dont le siège est situé à 11 RUE CHAKIB ARRSALANE MAGASIN 2 V.N. Fès Maroc, représentée par Hajar Choukri,', LEFT_MARGIN, 43, USABLE_WIDTH);
  doc.text('ci-après dénommée "Le Loueur".', LEFT_MARGIN, currentY);
  currentY += 5;

  doc.text('Et :', LEFT_MARGIN, currentY + 2);
  currentY += 7;
  currentY = wrapText(doc, `Madame ${clientName} ${clientSurname}, demeurant à ${clientAddress}, titulaire de la CIN N°${clientIdNumber}, ci-après dénommé(e) "Le Locataire".`, LEFT_MARGIN, currentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.text('Objet du contrat :', LEFT_MARGIN, currentY + 8);
  currentY += 14;
  doc.setFont('helvetica', 'normal');
  currentY = wrapText(doc, 'La présente convention a pour objet la location d\'une robe de mariée ainsi que des accessoires par The Bridal House, selon les termes et conditions ci-dessous.', LEFT_MARGIN, currentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('1. Détails du Mariage :', LEFT_MARGIN, currentY + 8);
  doc.setTextColor(0, 0, 0); // Reset to black
  currentY += 14;
  doc.setFont('helvetica', 'normal');
  doc.text(`• Ville du mariage : ${weddingCity}`, LEFT_MARGIN + 5, currentY);
  currentY += 5;
  doc.text(`• Date du mariage : ${weddingDate}`, LEFT_MARGIN + 5, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('2. Liste des articles loués :', LEFT_MARGIN, currentY + 3);
  doc.setTextColor(0, 0, 0); // Reset to black
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  
  // Render products table with actual reservation items
  const tableEndY = renderProductsTable(doc, items, currencySettings, totalAmount, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('3. Paiement et conditions :', LEFT_MARGIN, tableEndY + 4);
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.setFont('helvetica', 'normal');
  doc.text(`• Montant de la location : ${formatCurrency(totalAmount, { settings: currencySettings.settings })}`, LEFT_MARGIN + 5, tableEndY + 9);
  doc.text(`• Acompte : ${formatCurrency(advanceAmount, { settings: currencySettings.settings })}`, LEFT_MARGIN + 5, tableEndY + 14);
  doc.text(`• Dépôt de garantie : ${formatCurrency(securityDepositAmount, { settings: currencySettings.settings })}`, LEFT_MARGIN + 5, tableEndY + 19);
  doc.text('Cette caution est remboursable sous réserve des conditions d\'utilisation ci-après.', LEFT_MARGIN, tableEndY + 24);

  doc.addPage();
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('4. Durée de location :', LEFT_MARGIN, 20);
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.setFont('helvetica', 'normal');
  doc.text('La durée de location est de 24 heures.', LEFT_MARGIN, 28);
  let pageCurrentY = wrapText(doc, 'Pour les clientes hors Fès, la durée maximale est de 72 heures.', LEFT_MARGIN, 36, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Tout retard donne droit au Loueur de retenir la totalité ou une partie de la caution, en fonction de l\'impact du retard sur la préparation des articles pour la cliente suivante.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Il est impératif de respecter l\'horaire de retour afin de garantir un service optimal.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('5. Responsabilité en cas de dommages :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  pageCurrentY = wrapText(doc, 'En cas de dommage ou d\'altération d\'un ou plusieurs articles, le dépôt de garantie ne sera pas remboursé « Partiellement ou Totalement ».', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Le Loueur se réserve le droit de facturer des frais supplémentaires en fonction de l\'étendue des dommages.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('6. Entretien, lavage et réparation :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  pageCurrentY = wrapText(doc, 'Toute intervention de nettoyage, tentative de lavage ou de réparation des articles loués par le Locataire est strictement interdite.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Ces prestations sont exclusivement prises en charge par The Bridal House.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('7. Dates importantes :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  doc.text(`• Date et heure de retrait : ${pickupDate}`, LEFT_MARGIN + 5, pageCurrentY);
  pageCurrentY += 5;
  doc.text(`• Date et heure de retour : ${returnDate}`, LEFT_MARGIN + 5, pageCurrentY);
  pageCurrentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('8. Inspection au retour des articles :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  pageCurrentY = wrapText(doc, 'À la restitution, une inspection minutieuse est obligatoire.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Le Loueur se réserve un délai minimum de 30 minutes pour cette vérification.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, 'Si le Locataire est pressé ou ne peut patienter, il devra revenir ultérieurement pour récupérer sa caution.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('9. Partage de contenu sur les réseaux sociaux :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  pageCurrentY = wrapText(doc, 'Le Loueur demande l\'autorisation de partager des photos de la mariée portant les articles loués sur ses réseaux sociaux à des fins promotionnelles.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  doc.text('Merci de cocher une option :', LEFT_MARGIN, pageCurrentY);
  pageCurrentY += 5;
  pageCurrentY = wrapText(doc, '[ ] Oui, j\'autorise le partage des photos.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, '[ ] Oui, j\'autorise le partage des photos mais sans montrer mon visage.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  pageCurrentY = wrapText(doc, '[ ] Non, je n\'autorise pas le partage des photos.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 110, 164); // Blue color #1C6EA4
  doc.text('10. Acceptation des conditions :', LEFT_MARGIN, pageCurrentY + 6);
  doc.setTextColor(0, 0, 0); // Reset to black
  pageCurrentY += 12;
  doc.setFont('helvetica', 'normal');
  pageCurrentY = wrapText(doc, 'En signant ce contrat, le Locataire reconnaît avoir pris connaissance des termes et s\'engage à les respecter.', LEFT_MARGIN, pageCurrentY, USABLE_WIDTH);
  
  // Add line break and date before signature table
  pageCurrentY += 8;
  doc.text(`Fait à Fès, le ${new Date().toLocaleDateString('fr-FR')}`, LEFT_MARGIN, pageCurrentY);

  // Create signature table
  const signatureTableY = pageCurrentY + 8;
  const headerRowHeight = 12; // Compact header
  const signatureRowHeight = 35; // More space for signatures
  const col1Width = USABLE_WIDTH / 2;
  const col2Width = USABLE_WIDTH / 2;
  
  // Table border
  doc.rect(LEFT_MARGIN, signatureTableY, USABLE_WIDTH, headerRowHeight + signatureRowHeight);
  
  // Column separator
  doc.line(LEFT_MARGIN + col1Width, signatureTableY, LEFT_MARGIN + col1Width, signatureTableY + headerRowHeight + signatureRowHeight);
  
  // Row separator (between header and signature rows)
  doc.line(LEFT_MARGIN, signatureTableY + headerRowHeight, LEFT_MARGIN + USABLE_WIDTH, signatureTableY + headerRowHeight);
  
  // Table headers - compact
  doc.setFont('helvetica', 'bold');
  doc.text('Le Loueur', LEFT_MARGIN + (col1Width / 2) - 15, signatureTableY + 8);
  doc.text('Le Locataire', LEFT_MARGIN + col1Width + (col2Width / 2) - 20, signatureTableY + 8);
  
  // Signature content
  doc.setFont('helvetica', 'normal');
  doc.text('Signature :', LEFT_MARGIN + 5, signatureTableY + headerRowHeight + 10);
  doc.text(`Signature : ${clientName} ${clientSurname}`, LEFT_MARGIN + col1Width + 5, signatureTableY + headerRowHeight + 10);
  
  // Add signature image if available - within table bounds
  if (signatureImage) {
    doc.addImage(signatureImage, 'PNG', LEFT_MARGIN + 5, signatureTableY + headerRowHeight + 8, 50, 25);
  }

  // Open PDF in new tab for preview instead of downloading
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};

export default handleDownloadWeddingDressRentalContract;