import type { Metadata } from 'next';
import Arcade from '../../components/Arcade';

export const metadata: Metadata = { title: 'Play Connect Four | Fourfold Arcade' };

export default function PlayPage() {
  return <Arcade />;
}
