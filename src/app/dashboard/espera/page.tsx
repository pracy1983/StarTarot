import Link from 'next/link';

export default function EsperaPage() {
  return (
    <div className="min-h-screen flex items-start justify-center text-white bg-cover bg-center" style={{ backgroundImage: 'url(/path/to/background.jpg)' }}>
      <div className="bg-black/40 backdrop-blur-md p-6 rounded-lg text-center mt-20">
        <h1 className="text-3xl font-bold mb-4">Sua pergunta foi enviada.</h1>
        <p className="mb-4">Quando você for respondido, receberá uma notificação e verá ela na sua <Link href="/dashboard/mensagens" className="text-primary hover:underline">caixa de mensagens</Link>.</p>
      </div>
    </div>
  );
}
