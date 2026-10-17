export interface QuotationItem {
  id: string;
  description: string;
  hsnCode?: string;
  unit: string;
  quantity: number;
  rate: number;
  discount: number;
  gstRate: number;
  amount: number;
}

export interface QuotationData {
  id: string;
  quoteNumber: string;
  title: string;
  description?: string;
  status: string;
  revision: number;
  validTill?: Date;
  createdAt: Date;
  updatedAt: Date;

  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstNumber?: string;
    logo?: string;
  };

  customer: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    gstNumber?: string;
  };

  items: QuotationItem[];

  discountType: string;
  discountValue: number;
  additionalCharges: number;
  shippingCharges: number;
  taxExcluded: boolean;
  notes?: string;
  terms?: string;
}

export interface DashboardStats {
  totalQuotations: number;
  draftQuotations: number;
  sentQuotations: number;
  approvedQuotations: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalCustomers: number;
  totalProducts: number;
}
