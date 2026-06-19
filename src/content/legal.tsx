import { ReactNode } from "react";

export type LegalSlug = "termos" | "privacidade" | "cookies";

export interface LegalDoc {
  title: string;
  updatedAt: string;
  body: ReactNode;
}

const COMPANY_INFO = (
  <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 text-sm">
    <p><strong>Empresa:</strong> Moderno e Peculiar Unip Lda.</p>
    <p><strong>NIF:</strong> 515017370</p>
    <p><strong>Morada:</strong> Rua do Mercado, 21 1.º, Algueirão-Mem Martins</p>
    <p>
      <strong>Contacto:</strong>{" "}
      <a className="text-primary hover:underline" href="mailto:privacidade@obrasys.pt">privacidade@obrasys.pt</a>{" "}
      | +351 935 502 656
    </p>
  </div>
);

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 text-xl font-semibold text-text-strong">{children}</h2>;
}
function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-5 text-base font-semibold text-text-strong">{children}</h3>;
}

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDoc> = {
  termos: {
    title: "Termos e Condições de Uso",
    updatedAt: "19 de agosto de 2025",
    body: (
      <>
        <p>
          Bem-vindo à ObraSys! Estes Termos e Condições de Uso ("Termos") regem o seu acesso e utilização da nossa
          plataforma de software como serviço (SaaS) destinada à gestão de projetos de construção e remodelação
          ("Plataforma" ou "Serviço"), disponibilizada pela Moderno e Peculiar Unip Lda.
        </p>
        {COMPANY_INFO}

        <H2>1. Aceitação dos Termos</H2>
        <p>
          Ao criar uma conta, aceder ou utilizar a nossa Plataforma, o Utilizador concorda em ficar vinculado por estes
          Termos. Se não concordar com alguma parte dos termos, não poderá aceder ao Serviço.
        </p>

        <H2>2. Descrição do Serviço</H2>
        <p>
          A ObraSys é uma plataforma online que oferece ferramentas para orçamentação técnica, gestão de obra, controlo
          financeiro, comunicação com clientes e gestão de conformidade legal para empresas do setor da construção.
        </p>

        <H2>3. Contas de Utilizador</H2>
        <H3>Registo</H3>
        <p>Para aceder à Plataforma, é necessário criar uma conta, fornecendo informações verdadeiras, atuais e completas.</p>
        <H3>Responsabilidade</H3>
        <p>
          O Utilizador é o único responsável por manter a confidencialidade da sua palavra-passe e por todas as
          atividades que ocorram na sua conta. Deverá notificar-nos imediatamente sobre qualquer uso não autorizado.
        </p>
        <H3>Perfis</H3>
        <p>
          O Utilizador "Admin" é responsável por gerir os acessos dos restantes perfis (Gestor de Obra, Cliente Final,
          etc.) associados à sua empresa.
        </p>

        <H2>4. Modelo de Subscrição e Pagamentos</H2>
        <H3>Subscrição</H3>
        <p>O acesso à Plataforma é baseado numa subscrição mensal ou anual, paga antecipadamente. Os planos e os respetivos preços estão detalhados na nossa página de preços.</p>
        <H3>Faturação</H3>
        <p>A faturação é recorrente e automática. As faturas serão emitidas pela Moderno e Peculiar Unip Lda. e enviadas para o email de faturação associado à conta.</p>
        <H3>Cancelamento</H3>
        <p>O Utilizador pode cancelar a sua subscrição a qualquer momento através das definições da sua conta. O cancelamento terá efeito no final do ciclo de faturação em curso. Não haverá lugar a reembolsos por períodos de subscrição não utilizados.</p>

        <H2>5. Propriedade Intelectual</H2>
        <H3>A Nossa Propriedade</H3>
        <p>A Plataforma ObraSys, incluindo o seu software, design, logótipos, textos e funcionalidades, é e permanecerá propriedade exclusiva da Moderno e Peculiar Unip Lda.</p>
        <H3>A Sua Propriedade</H3>
        <p>Todos os dados, informações, ficheiros e conteúdos que o Utilizador insere na Plataforma ("Dados do Utilizador") são da sua inteira propriedade e responsabilidade. O Utilizador concede-nos uma licença limitada para processar esses dados com o único propósito de lhe fornecer o Serviço.</p>

        <H2>6. Obrigações e Uso Aceitável</H2>
        <p>O Utilizador concorda em não usar a Plataforma para:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Qualquer finalidade ilegal ou não autorizada.</li>
          <li>Violar quaisquer leis ou regulamentos aplicáveis, incluindo legislação de construção, segurança no trabalho e proteção de dados.</li>
          <li>Tentar obter acesso não autorizado aos nossos sistemas ou redes.</li>
        </ul>

        <H2>7. Limitação de Responsabilidade</H2>
        <p>A Plataforma ObraSys é uma ferramenta de assistência e organização. A responsabilidade final pela exatidão dos orçamentos, pela gestão da obra, pelo cumprimento das obrigações legais e pela tomada de decisões técnicas é inteiramente do Utilizador.</p>
        <p>Não nos responsabilizamos por quaisquer danos diretos ou indiretos, perdas de lucro ou de dados resultantes da utilização ou incapacidade de utilização do nosso Serviço.</p>
        <p>A nossa responsabilidade total, em qualquer caso, estará limitada ao montante pago pelo Utilizador nos 12 meses anteriores ao evento que deu origem à reclamação.</p>

        <H2>8. Vigência e Rescisão</H2>
        <p>Estes Termos permanecem em vigor enquanto o Utilizador mantiver uma conta ativa. Reservamo-nos o direito de suspender ou encerrar a conta do Utilizador caso ocorra uma violação grave destes Termos.</p>

        <H2>9. Lei Aplicável e Foro</H2>
        <p>Estes Termos serão regidos e interpretados de acordo com a lei portuguesa. Para a resolução de quaisquer litígios, fica estabelecido como competente o Tribunal da Comarca de Lisboa, com expressa renúncia a qualquer outro.</p>
      </>
    ),
  },

  privacidade: {
    title: "Política de Privacidade",
    updatedAt: "19 de agosto de 2025",
    body: (
      <>
        <p>
          A Moderno e Peculiar Unip Lda. ("nós", "ObraSys") está empenhada em proteger a sua privacidade. Esta Política
          de Privacidade explica como recolhemos, usamos, partilhamos e protegemos os seus dados pessoais em
          conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD) (UE) 2016/679.
        </p>
        {COMPANY_INFO}

        <H2>1. O Nosso Papel: Responsável pelo Tratamento vs. Subcontratante</H2>
        <H3>Responsáveis pelo Tratamento</H3>
        <p>Somos "Responsáveis pelo Tratamento" quando recolhemos os seus dados para gerir a sua conta na ObraSys (ex: nome, email, NIF, dados de pagamento). Neste caso, nós definimos a finalidade e os meios do tratamento.</p>
        <H3>Subcontratantes</H3>
        <p>Somos "Subcontratantes" para todos os dados que a sua empresa (o "Responsável pelo Tratamento") insere na nossa Plataforma sobre os seus próprios clientes, obras, funcionários e subempreiteiros. Neste cenário, atuamos apenas sob as suas instruções, conforme definido no nosso Acordo de Tratamento de Dados (disponível para todos os clientes).</p>

        <H2>2. Dados que Recolhemos (Como Responsáveis pelo Tratamento)</H2>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Dados de Identificação:</strong> Nome, email, contacto telefónico.</li>
          <li><strong>Dados da Empresa:</strong> Nome da empresa, NIF, morada.</li>
          <li><strong>Dados de Faturação:</strong> Informações necessárias para processar pagamentos e emitir faturas.</li>
          <li><strong>Dados de Utilização:</strong> Informações sobre como interage com a nossa Plataforma, para fins de melhoria do serviço.</li>
        </ul>

        <H2>3. Finalidades do Tratamento</H2>
        <ul className="ml-5 list-disc space-y-1">
          <li>Fornecer, manter e melhorar o Serviço ObraSys.</li>
          <li>Processar a sua subscrição e pagamentos.</li>
          <li>Comunicar consigo sobre a sua conta, atualizações do serviço e suporte técnico.</li>
          <li>Cumprir as nossas obrigações legais e fiscais.</li>
        </ul>

        <H2>4. Partilha de Dados</H2>
        <p>Não vendemos os seus dados. Partilhamos informações apenas com subcontratantes essenciais para a prestação do nosso serviço, que estão contratualmente obrigados a cumprir o RGPD:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Provedores de Infraestrutura Cloud (ex: AWS, Google Cloud).</li>
          <li>Processadores de Pagamento (ex: Stripe, Ifthenpay).</li>
          <li>Ferramentas de Análise e Comunicação.</li>
        </ul>

        <H2>5. Segurança dos Dados</H2>
        <ul className="ml-5 list-disc space-y-1">
          <li>Encriptação de dados em trânsito (HTTPS) e em repouso.</li>
          <li>Controlos de acesso restritos para garantir que apenas pessoal autorizado acede aos dados.</li>
          <li>Isolamento total dos dados entre diferentes empresas clientes (multi-tenancy).</li>
        </ul>

        <H2>6. Os Seus Direitos como Titular dos Dados (RGPD)</H2>
        <ul className="ml-5 list-disc space-y-1">
          <li>Aceder aos seus dados pessoais.</li>
          <li>Retificar dados incorretos ou incompletos.</li>
          <li>Apagar os seus dados ("direito ao esquecimento").</li>
          <li>Limitar o tratamento dos seus dados.</li>
          <li>Opor-se ao tratamento.</li>
          <li>Solicitar a portabilidade dos seus dados.</li>
        </ul>
        <p>
          Para exercer qualquer um destes direitos, contacte-nos através de{" "}
          <a className="text-primary hover:underline" href="mailto:privacidade@obrasys.pt">privacidade@obrasys.pt</a>.
        </p>

        <H2>7. Conservação dos Dados</H2>
        <p>Conservaremos os seus dados pessoais apenas durante o tempo necessário para cumprir as finalidades para as quais foram recolhidos, incluindo o cumprimento de obrigações legais (ex: dados de faturação devem ser mantidos por 10 anos). Após o cancelamento da sua conta, os dados operacionais serão eliminados de acordo com os prazos definidos nos nossos Termos.</p>

        <H2>8. Cookies</H2>
        <p>Utilizamos cookies essenciais para o funcionamento da Plataforma e cookies de análise para melhorar a experiência. Pode gerir as suas preferências nas definições do seu navegador ou consultar a nossa Política de Cookies.</p>

        <H2>9. Alterações a esta Política</H2>
        <p>Podemos atualizar esta Política de Privacidade periodicamente. Notificá-lo-emos de quaisquer alterações significativas através de e-mail ou de um aviso na nossa Plataforma.</p>
      </>
    ),
  },

  cookies: {
    title: "Política de Cookies",
    updatedAt: "18 de janeiro de 2026",
    body: (
      <>
        <p>O presente documento explica o que são cookies, como o ObraSys os utiliza e como o utilizador pode geri-los, em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD) e a legislação aplicável.</p>

        <H2>1. O que são cookies?</H2>
        <p>Cookies são pequenos ficheiros de texto armazenados no seu dispositivo (computador, tablet ou smartphone) quando visita um website. Estes ficheiros permitem reconhecer o utilizador, melhorar a experiência de navegação e recolher informações estatísticas.</p>

        <H2>2. Que tipos de cookies utilizamos?</H2>
        <p>O ObraSys utiliza apenas os cookies estritamente necessários e, quando aplicável, cookies adicionais mediante consentimento explícito do utilizador.</p>

        <H3>2.1 Cookies estritamente necessários (obrigatórios)</H3>
        <p>Essenciais para o funcionamento do website e da aplicação, não podendo ser desativados.</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Autenticação de utilizadores</li>
          <li>Manutenção da sessão</li>
          <li>Segurança da plataforma</li>
          <li>Funcionamento correto das funcionalidades principais</li>
        </ul>
        <p className="text-sm text-text-muted"><strong>Base legal:</strong> Interesse legítimo / Execução de contrato. <strong>Consentimento:</strong> Não obrigatório.</p>

        <H3>2.2 Cookies de funcionalidade</H3>
        <p>Permitem recordar preferências do utilizador (idioma, preferências de visualização, região ou contexto da obra).</p>
        <p className="text-sm text-text-muted"><strong>Base legal:</strong> Consentimento do utilizador.</p>

        <H3>2.3 Cookies analíticos (opcionais)</H3>
        <p>Utilizados para recolher dados estatísticos anónimos sobre a utilização da plataforma (páginas visitadas, tempo de navegação, erros técnicos), ajudando a melhorar desempenho e funcionalidades.</p>
        <p className="text-sm text-text-muted"><strong>Base legal:</strong> Consentimento do utilizador. Só são ativados após aceitação explícita.</p>

        <H3>2.4 Cookies de terceiros</H3>
        <p>O ObraSys pode utilizar serviços de terceiros (ex.: analytics, infraestrutura cloud), que podem definir cookies próprios sujeitos às políticas de privacidade dos respetivos fornecedores.</p>

        <H2>3. Lista de cookies utilizados</H2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                <th className="py-2 pr-4 font-semibold">Tipo</th>
                <th className="py-2 pr-4 font-semibold">Finalidade</th>
                <th className="py-2 font-semibold">Duração</th>
              </tr>
            </thead>
            <tbody className="text-text-default">
              <tr className="border-b border-border-subtle"><td className="py-2 pr-4">Sessão</td><td className="py-2 pr-4">Autenticação</td><td className="py-2">Sessão</td></tr>
              <tr className="border-b border-border-subtle"><td className="py-2 pr-4">Segurança</td><td className="py-2 pr-4">Proteção contra abuso</td><td className="py-2">Sessão</td></tr>
              <tr className="border-b border-border-subtle"><td className="py-2 pr-4">Preferências</td><td className="py-2 pr-4">Idioma / região</td><td className="py-2">Até 12 meses</td></tr>
              <tr><td className="py-2 pr-4">Analíticos</td><td className="py-2 pr-4">Estatísticas anónimas</td><td className="py-2">Até 24 meses</td></tr>
            </tbody>
          </table>
        </div>

        <H2>4. Gestão de cookies</H2>
        <p>Ao aceder ao ObraSys pela primeira vez, é apresentado um banner de consentimento onde pode aceitar todos os cookies, rejeitar os opcionais ou configurar preferências. Pode alterar ou retirar o consentimento a qualquer momento através das definições do navegador ou da área de configurações da plataforma.</p>

        <H2>5. Como desativar cookies no navegador</H2>
        <p>Pode configurar o seu navegador para bloquear ou eliminar cookies. A desativação de cookies essenciais pode comprometer o funcionamento da plataforma.</p>

        <H2>6. Proteção de dados pessoais</H2>
        <p>A utilização de cookies pode envolver o tratamento de dados pessoais. Para mais informações, consulte a nossa Política de Privacidade.</p>

        <H2>7. Alterações à Política de Cookies</H2>
        <p>O ObraSys reserva-se o direito de atualizar esta Política a qualquer momento. Recomendamos a consulta periódica deste documento.</p>

        <H2>8. Contactos</H2>
        <p>
          Para qualquer questão relacionada com esta Política de Cookies ou com a proteção de dados, contacte-nos através de{" "}
          <a className="text-primary hover:underline" href="mailto:contacto@obrasys.pt">contacto@obrasys.pt</a>.
        </p>
      </>
    ),
  },
};
