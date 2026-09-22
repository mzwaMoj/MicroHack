import { Product } from '../models/product';
import { Supplier } from '../models/supplier';
import { getProductsRepository } from '../repositories/productsRepo';
import { getSuppliersRepository } from '../repositories/suppliersRepo';

export interface CatalogDocument {
  id: string;
  type: 'product' | 'supplier';
  title: string;
  content: string;
  product?: Product;
  supplier: Supplier;
}

export interface CatalogKnowledge {
  documents: CatalogDocument[];
  fingerprint: string;
}

const productCategories: Record<string, string> = {
  'SmartFeeder One': 'Feeding & Hydration',
  'HydroFlow Smart Bowl': 'Feeding & Hydration',
  'AutoClean Litter Dome': 'Litter & Hygiene',
  'PurrFect Groomer Bot': 'Litter & Hygiene',
  'CatFlix Entertainment Portal': 'Entertainment & Enrichment',
  'ClimbCast Cat Tree': 'Entertainment & Enrichment',
  'ZoomieTracker AI Mat': 'Entertainment & Enrichment',
  'WhiskerCam Pro': 'Monitoring & Safety',
  'PawTrack Smart Collar': 'Monitoring & Safety',
  'DoorDash Smart Portal': 'Monitoring & Safety',
  'ThermoNest Deluxe': 'Comfort & Health Recovery',
  'MemoryFoam Recovery Pod': 'Comfort & Health Recovery',
};

function formatSupplier(supplier: Supplier): string {
  return [
    `Supplier: ${supplier.name}.`,
    supplier.description,
    `Active: ${supplier.active ? 'yes' : 'no'}.`,
    `Verified: ${supplier.verified ? 'yes' : 'no'}.`,
    `Contact: ${supplier.contactPerson}, ${supplier.email}, ${supplier.phone}.`,
  ].join(' ');
}

function formatProduct(product: Product, supplier: Supplier): string {
  const category = productCategories[product.name] ?? 'Uncategorized';
  const discount = product.discount ? `${product.discount * 100}%` : 'none';

  return [
    `Product: ${product.name}.`,
    `Category: ${category}.`,
    `SKU: ${product.sku}.`,
    product.description,
    `Price: $${product.price.toFixed(2)} per ${product.unit}.`,
    `Discount: ${discount}.`,
    formatSupplier(supplier),
  ].join(' ');
}

export async function loadCatalogKnowledge(): Promise<CatalogKnowledge> {
  const [productsRepository, suppliersRepository] = await Promise.all([
    getProductsRepository(),
    getSuppliersRepository(),
  ]);
  const [products, suppliers] = await Promise.all([
    productsRepository.findAll(),
    suppliersRepository.findAll(),
  ]);
  const suppliersById = new Map(suppliers.map((supplier) => [supplier.supplierId, supplier]));

  const productDocuments = products.flatMap((product): CatalogDocument[] => {
    const supplier = suppliersById.get(product.supplierId);
    if (!supplier) {
      return [];
    }

    return [{
      id: `product-${product.productId}`,
      type: 'product',
      title: product.name,
      content: formatProduct(product, supplier),
      product,
      supplier,
    }];
  });

  const supplierDocuments: CatalogDocument[] = suppliers.map((supplier) => ({
    id: `supplier-${supplier.supplierId}`,
    type: 'supplier',
    title: supplier.name,
    content: formatSupplier(supplier),
    supplier,
  }));
  const documents = [...productDocuments, ...supplierDocuments];

  return {
    documents,
    fingerprint: JSON.stringify(documents.map(({ id, content }) => ({ id, content }))),
  };
}