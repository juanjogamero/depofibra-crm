import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ChevronDown } from 'lucide-react';
import { useCrm } from '../store';
import { dateText, dayDiff, today, type Opportunity, type Quote, type Task } from '../domain';

type Period = '8-semanas' | '6-meses';
type ChartRow = { label: string; inquiries: number; quotes: number };
type Coordinates = { x: number; y: number };
const isClosed = (o: Opportunity) => o.status === 'Aceptada' || o.status === 'Perdida';

function inPeriod(date: string, period: Period): boolean {
  if (!date) return false;
  if (period === '8-semanas') return dayDiff(date) >= 0 && dayDiff(date) < 56;
  const now = new Date(today() + 'T12:00:00');
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return date >= start.toISOString().slice(0, 10) && date <= today();
}

function chartRows(opportunities: Opportunity[], quotes: Quote[], period: Period): ChartRow[] {
  if (period === '6-meses') {
    const now = new Date(today() + 'T12:00:00');
    return Array.from({ length: 6 }, (_, i) => {
      const first = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = first.getFullYear() + '-' + String(first.getMonth() + 1).padStart(2, '0');
      return {
        label: first.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
        inquiries: opportunities.filter(o => o.createdAt.startsWith(key)).length,
        quotes: quotes.filter(q => q.createdAt.startsWith(key)).length,
      };
    });
  }
  return Array.from({ length: 8 }, (_, i) => {
    const age = (7 - i) * 7;
    const first = new Date(today() + 'T12:00:00');
    first.setDate(first.getDate() - age - 6);
    return {
      label: first.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', ''),
      inquiries: opportunities.filter(o => dayDiff(o.createdAt) >= age && dayDiff(o.createdAt) < age + 7).length,
      quotes: quotes.filter(q => dayDiff(q.createdAt) >= age && dayDiff(q.createdAt) < age + 7).length,
    };
  });
}

function curve(points: Coordinates[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return 'M ' + points[0].x + ' ' + points[0].y;
  return points.reduce((path, point, i) => {
    if (i === 0) return 'M ' + point.x + ' ' + point.y;
    const previous = points[i - 1];
    const before = points[i - 2] || previous;
    const after = points[i + 1] || point;
    const ax = previous.x + (point.x - before.x) / 6;
    const ay = previous.y + (point.y - before.y) / 6;
    const bx = point.x - (after.x - previous.x) / 6;
    const by = point.y - (after.y - previous.y) / 6;
    return path + ' C ' + ax + ' ' + ay + ' ' + bx + ' ' + by + ' ' + point.x + ' ' + point.y;
  }, '');
}

function ActivityChart({ rows }: { rows: ChartRow[] }) {
  const largest = Math.max(3, ...rows.flatMap(r => [r.inquiries, r.quotes]));
  const left = 36;
  const right = 722;
  const top = 18;
  const bottom = 220;
  const positions = rows.map((r, i) => ({
    ...r,
    x: left + (right - left) * i / Math.max(1, rows.length - 1),
    inquiriesY: bottom - r.inquiries / largest * (bottom - top),
    quotesY: bottom - r.quotes / largest * (bottom - top),
  }));

  return <div className="clear-chart-container">
    <svg viewBox="0 0 755 270" preserveAspectRatio="none" role="img"
      aria-label={'Evolución comercial: ' + rows.map(r => r.label + ': ' + r.inquiries + ' solicitudes y ' + r.quotes + ' presupuestos').join('; ')}>
      {[0, 1, 2, 3, 4].map(tick => {
        const y = bottom - tick / 4 * (bottom - top);
        return <g key={tick}>
          <line x1={left} x2={right} y1={y} y2={y} className="clear-chart-grid"/>
          <text x={left - 9} y={y + 4} textAnchor="end" className="clear-chart-y">{Math.round(largest * tick / 4)}</text>
        </g>;
      })}
      {positions.map(p => <line key={'v-' + p.label} x1={p.x} x2={p.x} y1={top} y2={bottom} className="clear-chart-grid clear-chart-grid-v"/>)}
      <path d={curve(positions.map(p => ({ x: p.x, y: p.inquiriesY })))} className="clear-chart-line clear-chart-line-primary"/>
      <path d={curve(positions.map(p => ({ x: p.x, y: p.quotesY })))} className="clear-chart-line clear-chart-line-secondary"/>
      {positions.map(p => <g key={p.label}>
        <circle cx={p.x} cy={p.inquiriesY} r="4.2" className="clear-chart-point-primary">
          <title>{p.label}: {p.inquiries} consultas</title>
        </circle>
        <circle cx={p.x} cy={p.quotesY} r="4.2" className="clear-chart-point-secondary">
          <title>{p.label}: {p.quotes} presupuestos</title>
        </circle>
        <text x={p.x} y="252" className="clear-chart-x" textAnchor="middle">{p.label}</text>
      </g>)}
    </svg>
  </div>;
}

function Metric({ number, title, to }: { number: number; title: string; to: string }) {
  return <Link className="clear-metric" to={to}>
    <strong>{new Intl.NumberFormat('es-ES').format(number)}</strong>
    <span>{title}</span>
  </Link>;
}

function PendingTable({ opportunities }: { opportunities: Opportunity[] }) {
  const items = opportunities
    .filter(o => !isClosed(o))
    .sort((a, b) =>
      (a.nextDate || '9999-12-31').localeCompare(b.nextDate || '9999-12-31') ||
      a.createdAt.localeCompare(b.createdAt)
    )
    .slice(0, 4);

  if (items.length === 0) {
    return <p className="clear-empty">No hay solicitudes pendientes de respuesta.</p>;
  }
  return <div className="clear-table-wrap">
    <table className="clear-table">
      <thead><tr><th>Contacto</th><th>Próxima acción</th><th>Fecha</th></tr></thead>
      <tbody>{items.map(o => <tr key={o.id}>
        <td><Link to={'/oportunidades/' + o.id} className="clear-cell-strong" title={o.name}>{o.name}</Link></td>
        <td><span className="clear-truncate" title={o.nextAction || 'Sin acción definida'}>{o.nextAction || 'Sin acción definida'}</span></td>
        <td><span className={o.nextDate && o.nextDate <= today() ? 'clear-overdue' : ''}>{dateText(o.nextDate)}</span></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function AgendaTable({ tasks }: { tasks: Task[] }) {
  const items = tasks.filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  if (items.length === 0) {
    return <p className="clear-empty">No tienes tareas pendientes en la agenda.</p>;
  }
  return <div className="clear-table-wrap">
    <table className="clear-table">
      <thead><tr><th>Fecha</th><th>Tarea</th><th>Asociado a</th></tr></thead>
      <tbody>{items.map(t => <tr key={t.id}>
        <td><span className={t.due && t.due <= today() ? 'clear-overdue' : ''}>{dateText(t.due)}</span></td>
        <td><Link className="clear-cell-strong" to="/agenda" title={t.title}>{t.title}</Link></td>
        <td><span className="clear-truncate" title={t.context}>{t.context}</span></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export default function Dashboard() {
  const { data } = useCrm();
  const [period, setPeriod] = useState<Period>('8-semanas');
  const outstanding = data.opportunities.filter(o => !isClosed(o)).length;
  const unanswered = data.opportunities.filter(o => o.status === 'Nueva').length;
  const quoted = data.quotes.filter(q => q.status === 'Enviado' || q.status === 'Aceptado').length;
  const ongoing = data.orders.filter(o => o.factory !== 'Entregado').length;
  const periodOpportunities = data.opportunities.filter(o => inPeriod(o.createdAt, period));
  const periodQuotes = data.quotes.filter(q => inPeriod(q.createdAt, period));
  const confirmed = periodOpportunities.filter(o => o.status === 'Aceptada').length;
  const rows = chartRows(data.opportunities, data.quotes, period);

  return <div className="page page-dashboard dashboard-clean">
    <div className="clear-layout">
      <div className="clear-metrics" aria-label="Indicadores comerciales">
        <Metric number={outstanding} title="Oportunidades abiertas" to="/oportunidades"/>
        <Metric number={unanswered} title="Sin responder" to="/oportunidades"/>
        <Metric number={quoted} title="Presupuestos enviados" to="/presupuestos"/>
        <Metric number={ongoing} title="Pedidos en curso" to="/pedidos"/>
      </div>

      <section className="clear-chart-panel">
        <div className="clear-chart-main">
          <div className="clear-heading">
            <div className="clear-title-group">
              <h2>Evolución comercial</h2>
              <span className="clear-hint">Consultas y presupuestos registrados</span>
            </div>
            <div className="clear-chart-controls">
              <span className="clear-series"><i className="clear-key-primary"/>Consultas</span>
              <span className="clear-series"><i className="clear-key-secondary"/>Presupuestos</span>
              <label className="clear-period">
                <span className="sr-only">Período del gráfico</span>
                <select value={period} onChange={event => setPeriod(event.target.value as Period)} aria-label="Período de evolución comercial">
                  <option value="8-semanas">Últimas 8 semanas</option>
                  <option value="6-meses">Últimos 6 meses</option>
                </select>
                <ChevronDown aria-hidden="true" size={14}/>
              </label>
            </div>
          </div>
          <ActivityChart rows={rows}/>
        </div>
        <div className="clear-chart-aside" aria-label="Resumen del período">
          <div className="clear-summary">
            <span>Consultas recibidas</span>
            <strong>{periodOpportunities.length}</strong>
          </div>
          <div className="clear-summary">
            <span>Presupuestos preparados</span>
            <strong>{periodQuotes.length}</strong>
          </div>
          <div className="clear-summary clear-summary-final">
            <span>Oportunidades aceptadas</span>
            <strong>{confirmed}</strong>
          </div>
          <small>Datos de demostración</small>
        </div>
      </section>

      <div className="clear-lists">
        <section className="clear-list-section">
          <div className="clear-list-title">
            <h2>Pendientes de respuesta</h2>
            <Link to="/oportunidades">Ver todas <ArrowRight size={14}/></Link>
          </div>
          <PendingTable opportunities={data.opportunities}/>
        </section>

        <section className="clear-list-section">
          <div className="clear-list-title">
            <h2>Próximas tareas</h2>
            <Link to="/agenda">Abrir agenda <ArrowRight size={14}/></Link>
          </div>
          <AgendaTable tasks={data.tasks}/>
        </section>
      </div>
    </div>
  </div>;
}
