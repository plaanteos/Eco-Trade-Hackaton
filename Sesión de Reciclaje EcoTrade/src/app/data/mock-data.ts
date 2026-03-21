import { CollectionPoint, RecyclingSession, SessionStatus, TrustScore } from '../types';

export const COLLECTION_POINTS: CollectionPoint[] = [
  {
    id: 'pt-001',
    name: 'Centro de Acopio Municipal',
    address: 'Av. Libertador 1234, Centro',
    schedule: 'Lun-Vie 8:00-18:00, Sáb 9:00-13:00',
    distance: '2.3 km',
    acceptedMaterials: ['Plástico', 'Vidrio', 'Papel y cartón', 'Metal'],
    instructions: 'Ingrese por el portón lateral. Presente este código al operador.',
    limits: 'Máximo 100 kg por entrega',
  },
  {
    id: 'pt-002',
    name: 'EcoPunto Norte',
    address: 'Calle 45 #23-67, Zona Norte',
    schedule: 'Lun-Sáb 7:00-19:00',
    distance: '4.7 km',
    acceptedMaterials: ['Plástico', 'Vidrio', 'Papel y cartón', 'Metal', 'Electrónicos (RAEE)'],
    instructions: 'Estacionamiento disponible. Solicite ayuda si necesita descargar cantidades grandes.',
    limits: 'Sin límite de peso',
  },
  {
    id: 'pt-003',
    name: 'Recicladora del Sur',
    address: 'Av. Industrial km 8.5, Zona Sur',
    schedule: 'Lun-Vie 6:00-17:00',
    distance: '8.1 km',
    acceptedMaterials: ['Plástico', 'Metal', 'Electrónicos (RAEE)'],
    instructions: 'Solo materiales limpios y separados. No se aceptan residuos contaminados.',
    limits: 'Máximo 200 kg por entrega',
  },
  {
    id: 'pt-004',
    name: 'Centro Comunitario El Bosque',
    address: 'Carrera 12 #89-34, El Bosque',
    schedule: 'Mar-Dom 9:00-17:00',
    distance: '3.2 km',
    acceptedMaterials: ['Papel y cartón', 'Vidrio'],
    instructions: 'Punto comunitario. Horario sujeto a disponibilidad de voluntarios.',
    limits: 'Máximo 50 kg por entrega',
  },
];

// Helper to calculate trust score based on session data
export const calculateTrustScore = (session: Partial<RecyclingSession>): TrustScore => {
  const signals = [
    {
      id: 'materials-compatible',
      label: 'Materiales compatibles con el punto',
      passed: session.materials?.every(m => 
        session.point?.acceptedMaterials.includes(m.type)
      ) ?? false,
      critical: true
    },
    {
      id: 'kg-range',
      label: 'KG dentro de rango habitual',
      passed: (session.totalKg || 0) < 150 && (session.totalKg || 0) > 0,
      critical: false
    },
    {
      id: 'evidence-attached',
      label: 'Evidencia adjunta y legible',
      passed: (session.evidence?.length || 0) > 0,
      critical: false
    },
    {
      id: 'user-history',
      label: 'Historial de entregas verificadas',
      passed: true, // Mock: assume user has good history
      critical: false
    }
  ];

  // Check if RAEE requires extra evidence
  const hasRAEE = session.materials?.some(m => m.type === 'Electrónicos (RAEE)');
  if (hasRAEE) {
    signals.push({
      id: 'raee-evidence',
      label: 'RAEE requiere evidencia extra',
      passed: (session.evidence?.length || 0) >= 2,
      critical: true
    });
  }

  const passedSignals = signals.filter(s => s.passed).length;
  const criticalFailed = signals.some(s => s.critical && !s.passed);
  
  const score = Math.round((passedSignals / signals.length) * 100);
  
  let level: 'Alta' | 'Media' | 'Baja';
  if (score >= 80) level = 'Alta';
  else if (score >= 50) level = 'Media';
  else level = 'Baja';

  const requiresReview = criticalFailed || level === 'Baja';

  return { score, level, signals, requiresReview };
};

// Generate mock Solana receipt
export const generateSolanaReceipt = (sessionId: string) => {
  const mockSignature = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  
  return {
    signature: mockSignature,
    cluster: 'devnet' as const,
    explorerUrl: `https://explorer.solana.com/tx/${mockSignature}?cluster=devnet`,
    emittedAt: new Date(),
    programId: '11111111111111111111111111111111' // Memo program
  };
};

export const MOCK_SESSIONS: RecyclingSession[] = [
  {
    id: 'ses-001',
    sessionNumber: '000184',
    status: 'Completada',
    point: COLLECTION_POINTS[0],
    scheduledDate: '2026-03-04',
    scheduledTime: '10:00-12:00',
    materials: [
      { type: 'Plástico', kg: 12.5, verified: true, verifiedKg: 12.3 },
      { type: 'Papel y cartón', kg: 8.3, verified: true, verifiedKg: 8.3 },
      { type: 'Vidrio', kg: 5.2, verified: true, verifiedKg: 5.5 },
    ],
    evidence: ['evidence-1.jpg', 'evidence-2.jpg'],
    evidenceHash: 'sha256:a3f5b8c9d2e1f4a7b6c5d8e9f2a1b4c7d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4',
    totalKg: 26.0,
    verifiedTotalKg: 26.1,
    ecoCoins: 2,
    trustScore: {
      score: 95,
      level: 'Alta',
      signals: [
        { id: 'materials-compatible', label: 'Materiales compatibles con el punto', passed: true, critical: true },
        { id: 'kg-range', label: 'KG dentro de rango habitual', passed: true },
        { id: 'evidence-attached', label: 'Evidencia adjunta y legible', passed: true },
        { id: 'user-history', label: 'Historial de entregas verificadas', passed: true },
      ],
      requiresReview: false
    },
    solanaReceipt: {
      signature: '5wHu7QRXnZKQN2MB9FpnVgKJGk3yJxPQm8ZNzX4bY3rKvH8jL9mN6pQ2sT4uV7wX9yA1cD3eF5gH7iJ9kL0mN2o',
      cluster: 'devnet',
      explorerUrl: 'https://explorer.solana.com/tx/5wHu7QRXnZKQN2MB9FpnVgKJGk3yJxPQm8ZNzX4bY3rKvH8jL9mN6pQ2sT4uV7wX9yA1cD3eF5gH7iJ9kL0mN2o?cluster=devnet',
      emittedAt: new Date('2026-03-04T10:46:00'),
      programId: '11111111111111111111111111111111'
    },
    verifiedBy: 'Operador: Juan Pérez',
    timeline: [
      { status: 'Borrador', timestamp: new Date('2026-03-01T10:30:00'), actor: 'Usuario' },
      { status: 'Programada', timestamp: new Date('2026-03-01T10:35:00'), actor: 'Usuario' },
      { status: 'En curso', timestamp: new Date('2026-03-04T10:15:00'), actor: 'Operador' },
      { status: 'Completada', timestamp: new Date('2026-03-04T10:45:00'), actor: 'Operador', note: 'Verificado y procesado' },
    ],
    createdAt: new Date('2026-03-01T10:30:00'),
    updatedAt: new Date('2026-03-04T10:45:00'),
    qrCode: 'QR-SES-000184',
  },
  {
    id: 'ses-002',
    sessionNumber: '000185',
    status: 'Programada',
    point: COLLECTION_POINTS[1],
    scheduledDate: '2026-03-08',
    scheduledTime: '14:00-16:00',
    materials: [
      { type: 'Electrónicos (RAEE)', kg: 15.8, observation: 'Monitor y teclado' },
      { type: 'Metal', kg: 6.5 },
    ],
    evidence: ['evidence-raee.jpg'],
    totalKg: 22.3,
    ecoCoins: 0,
    estimatedEcoCoins: 2,
    trustScore: {
      score: 60,
      level: 'Media',
      signals: [
        { id: 'materials-compatible', label: 'Materiales compatibles con el punto', passed: true, critical: true },
        { id: 'kg-range', label: 'KG dentro de rango habitual', passed: true },
        { id: 'evidence-attached', label: 'Evidencia adjunta y legible', passed: true },
        { id: 'user-history', label: 'Historial de entregas verificadas', passed: true },
        { id: 'raee-evidence', label: 'RAEE requiere evidencia extra', passed: false, critical: true },
      ],
      requiresReview: true
    },
    timeline: [
      { status: 'Borrador', timestamp: new Date('2026-03-05T15:20:00'), actor: 'Usuario' },
      { status: 'Programada', timestamp: new Date('2026-03-05T15:25:00'), actor: 'Usuario' },
    ],
    createdAt: new Date('2026-03-05T15:20:00'),
    updatedAt: new Date('2026-03-05T15:25:00'),
    qrCode: 'QR-SES-000185',
  },
  {
    id: 'ses-003',
    sessionNumber: '000186',
    status: 'En curso',
    point: COLLECTION_POINTS[0],
    scheduledDate: '2026-03-06',
    scheduledTime: '09:00-11:00',
    materials: [
      { type: 'Plástico', kg: 18.7 },
      { type: 'Vidrio', kg: 11.3 },
    ],
    evidence: ['evidence-plastico.jpg'],
    totalKg: 30.0,
    ecoCoins: 0,
    estimatedEcoCoins: 3,
    trustScore: {
      score: 100,
      level: 'Alta',
      signals: [
        { id: 'materials-compatible', label: 'Materiales compatibles con el punto', passed: true, critical: true },
        { id: 'kg-range', label: 'KG dentro de rango habitual', passed: true },
        { id: 'evidence-attached', label: 'Evidencia adjunta y legible', passed: true },
        { id: 'user-history', label: 'Historial de entregas verificadas', passed: true },
      ],
      requiresReview: false
    },
    timeline: [
      { status: 'Borrador', timestamp: new Date('2026-03-03T08:00:00'), actor: 'Usuario' },
      { status: 'Programada', timestamp: new Date('2026-03-03T08:10:00'), actor: 'Usuario' },
      { status: 'En curso', timestamp: new Date('2026-03-06T09:05:00'), actor: 'Operador', note: 'Recepción iniciada' },
    ],
    createdAt: new Date('2026-03-03T08:00:00'),
    updatedAt: new Date('2026-03-06T09:05:00'),
    qrCode: 'QR-SES-000186',
  },
  {
    id: 'ses-004',
    sessionNumber: '000183',
    status: 'Cancelada',
    point: COLLECTION_POINTS[2],
    scheduledDate: '2026-02-28',
    scheduledTime: '08:00-10:00',
    materials: [
      { type: 'Metal', kg: 25.0 },
    ],
    evidence: [],
    totalKg: 25.0,
    ecoCoins: 0,
    estimatedEcoCoins: 2,
    timeline: [
      { status: 'Borrador', timestamp: new Date('2026-02-25T14:00:00'), actor: 'Usuario' },
      { status: 'Programada', timestamp: new Date('2026-02-25T14:05:00'), actor: 'Usuario' },
      { status: 'Cancelada', timestamp: new Date('2026-02-27T16:30:00'), actor: 'Usuario', note: 'No pude reunir el material a tiempo' },
    ],
    cancellationReason: 'No pude reunir el material a tiempo',
    createdAt: new Date('2026-02-25T14:00:00'),
    updatedAt: new Date('2026-02-27T16:30:00'),
  },
  {
    id: 'ses-005',
    sessionNumber: '000187',
    status: 'Pendiente de verificación',
    point: COLLECTION_POINTS[2],
    scheduledDate: '2026-03-05',
    scheduledTime: '10:00-12:00',
    materials: [
      { type: 'Plástico', kg: 180.0, observation: 'Gran cantidad de botellas PET' },
      { type: 'Metal', kg: 45.0 },
    ],
    evidence: [],
    evidenceHash: undefined,
    totalKg: 225.0,
    ecoCoins: 0,
    estimatedEcoCoins: 22,
    trustScore: {
      score: 40,
      level: 'Baja',
      signals: [
        { id: 'materials-compatible', label: 'Materiales compatibles con el punto', passed: true, critical: true },
        { id: 'kg-range', label: 'KG dentro de rango habitual', passed: false },
        { id: 'evidence-attached', label: 'Evidencia adjunta y legible', passed: false, critical: false },
        { id: 'user-history', label: 'Historial de entregas verificadas', passed: true },
      ],
      requiresReview: true
    },
    timeline: [
      { status: 'Borrador', timestamp: new Date('2026-03-04T16:00:00'), actor: 'Usuario' },
      { status: 'Programada', timestamp: new Date('2026-03-04T16:05:00'), actor: 'Usuario' },
      { status: 'En curso', timestamp: new Date('2026-03-05T10:10:00'), actor: 'Operador' },
      { status: 'Pendiente de verificación', timestamp: new Date('2026-03-05T10:15:00'), actor: 'Sistema', note: 'Confianza baja: requiere revisión antes de emitir on-chain' },
    ],
    createdAt: new Date('2026-03-04T16:00:00'),
    updatedAt: new Date('2026-03-05T10:15:00'),
    qrCode: 'QR-SES-000187',
  },
];

export const calculateEcoCoins = (totalKg: number): number => {
  return Math.floor(totalKg / 10);
};

export const calculateTotalKg = (materials: { kg: number }[]): number => {
  return materials.reduce((sum, m) => sum + m.kg, 0);
};