import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getStockItems } from '../data/initialData';
import { MessageSquare } from 'lucide-react';

export default function LowStockMonitor() {
  const { products, categories, movements, settings, updateSettings, currentUser } = useApp();
  const { showToast } = useToast();

  useEffect(() => {
    // Only admins or operators should manage alerts
    if (!currentUser || currentUser.role === 'viewer') return;
    if (!settings?.alertConfig?.enabled) return;

    const stockItems = getStockItems(products, categories, movements);
    const lowStockItems = stockItems.filter(s => s.isLow);

    if (lowStockItems.length === 0) return;

    const now = new Date().getTime();
    const lastSent = settings.alertConfig.lastAlertSent ? new Date(settings.alertConfig.lastAlertSent).getTime() : 0;
    const intervalMs = (settings.alertConfig.minIntervalHours || 1) * 60 * 60 * 1000;

    if (now - lastSent >= intervalMs) {
      const whatsapp = settings.alertConfig.whatsappNumber;
      if (!whatsapp) return;

      const number = whatsapp.replace(/\D/g, '');
      const message = encodeURIComponent(
        `⚠️ *ALERTA DE ESTOQUE BAIXO*\n\nExistem *${lowStockItems.length}* produtos abaixo do nível mínimo:\n\n` +
        lowStockItems.map(s => `- ${s.product.name}: ${s.currentStock} ${s.product.unit}`).join('\n') +
        `\n\n🔗 Acesse o sistema: ${window.location.origin}`
      );

      const handleSend = async () => {
        window.open(`https://wa.me/${number}?text=${message}`, '_blank');
        await updateSettings({
          alertConfig: {
            ...settings.alertConfig,
            lastAlertSent: new Date().toISOString()
          }
        });
      };

      showToast('warning', (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div><strong>Estoque Baixo Detectado!</strong></div>
          <div style={{ fontSize: '0.8rem' }}>{lowStockItems.length} produto(s) precisam de reposição.</div>
          <button 
            onClick={handleSend}
            style={{
              padding: '6px 12px', background: 'var(--success-600)', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600
            }}
          >
            <MessageSquare size={14} /> Enviar Alerta WhatsApp
          </button>
        </div>
      ) as any);
    }
  }, [products, movements, settings, currentUser]);

  return null;
}
