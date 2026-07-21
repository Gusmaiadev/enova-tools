import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { indiceDaEquipe } from '@/lib/leads/equipe'
import { type LeadResultado, ordenarLeads } from '@/lib/leads/resultado'
import { GeocodeError, geocodificar } from '@/lib/geo/geocode'
import { classificar } from '@/lib/places/classificar'
import { ramoDe } from '@/lib/places/ramos'
import { estadoUso, registrarChamadas } from '@/lib/places/usage'
import { MAX_PAGINAS_PADRAO, varrer } from '@/lib/places/varrer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Corpo = { uf?: string; cidade?: string; bairro?: string; tipo?: string }

export async function POST(req: Request) {
  // Rota de dados fora do matcher do proxy → verifica a sessao por conta propria,
  // com checkRevoked=true (autoritativo).
  const usuario = await lerUsuario(true)
  if (!usuario) {
    return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })
  }

  let corpo: Corpo
  try {
    corpo = await req.json()
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const uf = corpo.uf?.trim().toUpperCase()
  const cidade = corpo.cidade?.trim()
  const bairro = corpo.bairro?.trim()
  const ramo = corpo.tipo ? ramoDe(corpo.tipo) : undefined

  if (!uf || !/^[A-Z]{2}$/.test(uf) || !cidade || !bairro || !ramo) {
    return Response.json(
      { erro: 'Preencha estado, cidade, bairro e ramo.' },
      { status: 400 },
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enviar = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      try {
        // Trava de custo mensal antes de qualquer chamada paga.
        const uso = await estadoUso()
        if (uso.bloqueado) {
          enviar({
            tipo: 'erro',
            erro: `Limite mensal de buscas atingido (${uso.limite}). Reinicia no dia 1º.`,
          })
          controller.close()
          return
        }

        // Bairro → bounding box (Geocoding, SKU barato).
        let bbox
        try {
          bbox = await geocodificar(bairro, cidade, uf)
        } catch (e) {
          enviar({
            tipo: 'erro',
            erro: e instanceof GeocodeError ? e.message : 'Falha ao localizar o bairro.',
          })
          controller.close()
          return
        }
        enviar({ tipo: 'bbox', bbox })

        // Indice da equipe (dedupe + marcacao) numa query so.
        const indice = await indiceDaEquipe(usuario.teamId, usuario.uid)

        // Nunca ultrapassa o teto mensal restante dentro de uma unica busca.
        const teto = Math.min(MAX_PAGINAS_PADRAO, uso.restante)

        const resultado = await varrer(bbox, ramo.tipo, {
          termo: ramo.termo,
          maxPaginas: teto,
          signal: req.signal,
          onEvento: (e) => enviar(e), // alimenta o radar em tempo real
        })

        // Registra o custo real (paginas de fato billadas).
        await registrarChamadas(resultado.chamadas)

        // Classifica, remove os MEUS, marca os da EQUIPE.
        const leads: LeadResultado[] = []
        for (const place of resultado.places.values()) {
          if (indice.meus.has(place.id)) continue // meu lead nunca reaparece
          const marca = indice.equipe.get(place.id)
          leads.push({
            ...place,
            classificacao: classificar(place),
            tocadoPor: marca?.ownerName ?? null,
            statusEquipe: marca?.status ?? null,
          })
        }

        enviar({
          tipo: 'resultado',
          leads: ordenarLeads(leads),
          chamadas: resultado.chamadas,
          truncado: resultado.truncado,
          total: leads.length,
        })
        controller.close()
      } catch (e) {
        // Cliente desconectou (abort) ou erro inesperado.
        if (req.signal.aborted) {
          try {
            controller.close()
          } catch {}
          return
        }
        enviar({
          tipo: 'erro',
          erro: e instanceof Error ? e.message : 'Erro inesperado na busca.',
        })
        try {
          controller.close()
        } catch {}
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
