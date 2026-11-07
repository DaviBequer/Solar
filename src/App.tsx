import { useRoute } from './router';
import { useStore } from './data/store';
import { TabBar } from './ui/chrome';
import { Paper } from './ui/paper';
import { useReminders } from './reminders';
import Orcamento from './screens/Orcamento';
import Clientes from './screens/Clientes';
import Ficha from './screens/Ficha';
import Agenda from './screens/Agenda';
import Painel from './screens/Painel';
import Ajustes from './screens/Ajustes';
import Kits from './screens/Kits';
import Proposta from './screens/Proposta';

export default function App() {
  const route = useRoute();
  const { ready } = useStore();
  useReminders();

  if (!ready) {
    return <div className="app" aria-busy="true" />;
  }

  const withTabs = ['orcamento', 'clientes', 'agenda', 'painel', 'cliente'].includes(route.name);

  return (
    <div className="app">
      <Paper />
      {route.name === 'orcamento' && <Orcamento />}
      {route.name === 'clientes' && <Clientes />}
      {route.name === 'cliente' && route.id && <Ficha key={route.id} id={route.id} />}
      {route.name === 'agenda' && <Agenda />}
      {route.name === 'painel' && <Painel />}
      {route.name === 'ajustes' && <Ajustes />}
      {route.name === 'kits' && <Kits />}
      {route.name === 'proposta' && route.id && <Proposta key={route.id} id={route.id} />}
      <TabBar active={route.name} desktopOnly={!withTabs} />
    </div>
  );
}
