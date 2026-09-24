import { 
  Plus, 
  Map as MapIcon, 
  ChevronRight,
  Loader2,
  Search,
  ArrowRight,
  FlaskConical,
  Car,
  Zap,
  BarChart3,
  Briefcase,
  Cpu,
  Landmark,
  Stethoscope,
  GraduationCap,
  ShoppingBag,
  Truck,
  Building2,
  Hammer,
  Shield,
  Plane,
  Heart,
  Factory,
} from 'lucide-react';

export const getSectorIcon = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('ihracat') || n.includes('turkey exports') || (n.includes('export') && n.includes('turkey')))
    return Plane;
  if (n.includes('tarım') || n.includes('tarim') || n.includes('gıda') || n.includes('gida')) return Heart;
  if (n.includes('kimya') || n.includes('chem')) return FlaskConical;
  if (n.includes('otomotiv') || n.includes('automotive') || n.includes('mobility')) return Car;
  if (n.includes('elektrik') || n.includes('electron')) return Cpu;
  if (n.includes('makina') || n.includes('machine') || n.includes('aksam')) return Hammer;
  if (n.includes('demir') || n.includes('çelik') || n.includes('celik') || n.includes('steel')) return Building2;
  if (n.includes('çimento') || n.includes('cimento') || n.includes('cam') || n.includes('seramik')) return Building2;
  if (
    n.includes('kaynak dönüşümü') ||
    n.includes('kaynak donusumu') ||
    n.includes('resource transformation')
  ) {
    return Factory;
  }
  if (n.includes('diğer') || n.includes('diger') || n === 'other') return MapIcon;
  if (n.includes('auto')) return Car;
  if (n.includes('ener') || n.includes('util')) return Zap;
  if (n.includes('fina') || n.includes('bank')) return BarChart3;
  if (n.includes('tech') || n.includes('soft') || n.includes('it')) return Cpu;
  if (n.includes('gov') || n.includes('public')) return Landmark;
  if (n.includes('heal') || n.includes('med')) return Stethoscope;
  if (n.includes('educ') || n.includes('uni')) return GraduationCap;
  if (n.includes('reta') || n.includes('shop')) return ShoppingBag;
  if (n.includes('logi') || n.includes('ship')) return Truck;
  if (n.includes('cons')) return Briefcase;
  if (n.includes('real') || n.includes('prop')) return Building2;
  if (n.includes('shie') || n.includes('secu')) return Shield;
  if (n.includes('avia') || n.includes('air')) return Plane;
  if (n.includes('food') || n.includes('beve')) return Heart;
  return MapIcon;
};
