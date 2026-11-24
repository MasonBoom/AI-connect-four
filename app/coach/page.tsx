import type { Metadata } from 'next';
import Coach from '../../components/Coach';
import './coach.css';

export const metadata: Metadata = {
  title: 'Coach Mode | Fourfold Arcade',
  description: 'Practice Connect Four tactics with interactive drills, optional hints, and move feedback.',
};

export default function CoachPage() {
  return <Coach />;
}
