/**
 * Modelos de texto para as páginas de Termos de Uso e Política de Privacidade.
 *
 * Servem como ponto de partida no assistente (botão "Usar modelo"): o texto vai
 * para o campo e continua editável — o documento nunca guarda modelo escondido.
 * Módulo puro (roda no client).
 */

import type { TipoPaginaLegal } from './tipos'

export type DadosModelo = {
  marca: string
  email?: string
  endereco?: string
}

const hoje = () => new Date().toLocaleDateString('pt-BR')

const contato = (d: DadosModelo): string => {
  const partes = [d.email && `e-mail ${d.email}`, d.endereco && `endereço ${d.endereco}`].filter(
    Boolean,
  )
  return partes.length > 0 ? partes.join(' — ') : '[coloque aqui o e-mail de contato]'
}

function termos(d: DadosModelo): string {
  return `Última atualização: ${hoje()}

Este documento reúne as regras de uso do site de ${d.marca}. Ao navegar por aqui, você concorda com os termos abaixo.

## 1. Sobre o site
O site apresenta os serviços e produtos de ${d.marca} e serve como canal de contato com interessados. As informações têm caráter informativo e podem ser alteradas a qualquer momento, sem aviso prévio.

## 2. Uso permitido
Você pode navegar, ler e compartilhar o conteúdo do site para fins pessoais e não comerciais. É proibido copiar, reproduzir ou distribuir o conteúdo com fins comerciais sem autorização por escrito de ${d.marca}.

## 3. Propriedade intelectual
Textos, imagens, vídeos, marcas, logotipos e o próprio layout do site pertencem a ${d.marca} ou foram licenciados para uso. O uso indevido desse material sujeita o responsável às penalidades da lei.

## 4. Formulários e informações enviadas
Ao preencher um formulário do site, você declara que os dados informados são verdadeiros e autoriza o contato de ${d.marca} pelos canais informados. O tratamento desses dados está descrito na Política de Privacidade.

## 5. Links para outros sites
O site pode conter links para páginas de terceiros. ${d.marca} não se responsabiliza pelo conteúdo, pelas práticas de privacidade nem pelos serviços oferecidos nesses endereços.

## 6. Disponibilidade
${d.marca} se esforça para manter o site sempre no ar, mas não garante funcionamento ininterrupto: manutenções, falhas de conexão ou problemas com fornecedores podem deixar a página indisponível temporariamente.

## 7. Alterações destes termos
Estes termos podem ser atualizados a qualquer momento. A versão em vigor é sempre a publicada nesta página, com a data de atualização no topo.

## 8. Foro e contato
Estes termos são regidos pelas leis brasileiras. Dúvidas sobre este documento podem ser enviadas para ${contato(d)}.`
}

function privacidade(d: DadosModelo): string {
  return `Última atualização: ${hoje()}

Esta política explica como ${d.marca} coleta, usa e protege os dados de quem visita este site, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

## 1. Dados que coletamos
Coletamos apenas o que você nos envia: nome, e-mail, telefone e a mensagem escrita nos formulários do site. Também podemos coletar dados de navegação (páginas visitadas, tempo de visita, origem do acesso) por meio de cookies e ferramentas de análise.

## 2. Por que usamos esses dados
Os dados são usados para responder ao seu contato, enviar informações sobre os serviços de ${d.marca}, cumprir obrigações legais e melhorar a experiência de navegação no site.

## 3. Compartilhamento
Não vendemos nem alugamos dados pessoais. Podemos compartilhá-los com prestadores de serviço que apoiam a operação do site (hospedagem, e-mail, análise de tráfego) e com autoridades públicas, quando exigido por lei.

## 4. Cookies
Cookies são pequenos arquivos gravados no seu navegador. Usamos cookies necessários ao funcionamento do site e, quando você autoriza, cookies de análise e de marketing. Você pode bloqueá-los nas configurações do navegador — algumas partes do site podem deixar de funcionar corretamente.

## 5. Por quanto tempo guardamos
Os dados de contato ficam armazenados pelo tempo necessário para atender à sua solicitação e cumprir prazos legais. Depois disso são excluídos ou anonimizados.

## 6. Segurança
Adotamos medidas técnicas e administrativas para proteger os dados contra acesso não autorizado, perda ou divulgação indevida.

## 7. Seus direitos
Você pode pedir a qualquer momento a confirmação do tratamento, o acesso, a correção, a portabilidade, a anonimização ou a exclusão dos seus dados, além de revogar o consentimento dado.

## 8. Encarregado e contato
Para exercer seus direitos ou tirar dúvidas sobre esta política, fale com ${contato(d)}.

## 9. Alterações desta política
Esta política pode ser atualizada para acompanhar mudanças na legislação ou nos nossos processos. A versão em vigor é sempre a publicada nesta página.`
}

/** Texto inicial sugerido para a página, com os dados da marca já no lugar. */
export function modeloPagina(tipo: TipoPaginaLegal, dados: DadosModelo): string {
  return tipo === 'termos' ? termos(dados) : privacidade(dados)
}
