--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: status_espelho; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_espelho AS ENUM (
    'Em_Aberto',
    'Enviado_Funcionario',
    'Aprovado_Funcionario',
    'Fechado_RH'
);


ALTER TYPE public.status_espelho OWNER TO postgres;

--
-- Name: status_solicitacao; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_solicitacao AS ENUM (
    'Pendente',
    'Aprovado',
    'Recusado'
);


ALTER TYPE public.status_solicitacao OWNER TO postgres;

--
-- Name: tipo_notificacao; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_notificacao AS ENUM (
    'Informativo',
    'Solicitacao',
    'Urgente'
);


ALTER TYPE public.tipo_notificacao OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cargos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cargos (
    id integer NOT NULL,
    nome character varying(120) NOT NULL,
    departamento character varying(100),
    descricao text,
    hora_entrada time without time zone NOT NULL,
    saida_almoco time without time zone,
    retorno_almoco time without time zone,
    hora_saida time without time zone NOT NULL,
    tolerancia_entrada integer DEFAULT 10,
    tolerancia_saida integer DEFAULT 10,
    carga_horaria integer DEFAULT 44,
    ativo boolean DEFAULT true,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cbo_id integer,
    codigo character varying(20),
    limite_vale_percentual numeric(5,2) DEFAULT 40.00
);


ALTER TABLE public.cargos OWNER TO postgres;

--
-- Name: cargos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cargos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cargos_id_seq OWNER TO postgres;

--
-- Name: cargos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cargos_id_seq OWNED BY public.cargos.id;


--
-- Name: cbo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cbo (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    descricao character varying(200),
    ativo boolean DEFAULT true,
    nome character varying(255)
);


ALTER TABLE public.cbo OWNER TO postgres;

--
-- Name: cbo_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cbo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cbo_id_seq OWNER TO postgres;

--
-- Name: cbo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cbo_id_seq OWNED BY public.cbo.id;


--
-- Name: configuracoes_empresa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.configuracoes_empresa (
    id integer NOT NULL,
    nome_empresa character varying(255) DEFAULT 'Empresa Matriz'::character varying NOT NULL,
    latitude numeric(10,8) DEFAULT '-23.550520'::numeric NOT NULL,
    longitude numeric(11,8) DEFAULT '-46.633308'::numeric NOT NULL,
    raio_tolerancia_metros integer DEFAULT 100 NOT NULL,
    intervalo_minimo_minutos integer DEFAULT 15 NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cor_primaria character varying(7) DEFAULT '#38bdf8'::character varying,
    cor_secundaria character varying(30) DEFAULT '#2D2D30'::character varying,
    cor_destaque character varying(30) DEFAULT '#10B981'::character varying,
    responsavel_financeiro character varying(150),
    whatsapp_financeiro character varying(20)
);


ALTER TABLE public.configuracoes_empresa OWNER TO postgres;

--
-- Name: configuracoes_empresa_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.configuracoes_empresa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.configuracoes_empresa_id_seq OWNER TO postgres;

--
-- Name: configuracoes_empresa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.configuracoes_empresa_id_seq OWNED BY public.configuracoes_empresa.id;


--
-- Name: empresa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresa (
    id integer NOT NULL,
    razao_social character varying(200),
    nome_fantasia character varying(200),
    cnpj character varying(20),
    inscricao_estadual character varying(30),
    inscricao_municipal character varying(30),
    cnae character varying(20),
    fpas character varying(20),
    terceiros character varying(20),
    rat numeric(5,2),
    cep character varying(10),
    endereco character varying(200),
    numero character varying(20),
    bairro character varying(100),
    cidade character varying(100),
    estado character varying(2),
    telefone character varying(30),
    celular character varying(30),
    email character varying(120),
    site character varying(120),
    responsavel character varying(150),
    cargo_responsavel character varying(100),
    cpf_responsavel character varying(20),
    banco character varying(80),
    agencia character varying(20),
    conta character varying(30),
    dia_pagamento integer,
    fechamento_padrao integer,
    mensagem_holerite text,
    logo text
);


ALTER TABLE public.empresa OWNER TO postgres;

--
-- Name: empresa_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empresa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empresa_id_seq OWNER TO postgres;

--
-- Name: empresa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empresa_id_seq OWNED BY public.empresa.id;


--
-- Name: fechamento_funcionarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fechamento_funcionarios (
    id integer NOT NULL,
    fechamento_id integer NOT NULL,
    funcionario_id integer NOT NULL,
    horas_previstas numeric(10,2) DEFAULT 0,
    horas_trabalhadas numeric(10,2) DEFAULT 0,
    horas_extras numeric(10,2) DEFAULT 0,
    faltas integer DEFAULT 0,
    atrasos integer DEFAULT 0,
    status_aprovacao character varying(30) DEFAULT 'PENDENTE'::character varying,
    data_aprovacao timestamp without time zone,
    observacoes text,
    aprovado boolean DEFAULT false,
    aprovado_em timestamp without time zone
);


ALTER TABLE public.fechamento_funcionarios OWNER TO postgres;

--
-- Name: fechamento_funcionarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fechamento_funcionarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fechamento_funcionarios_id_seq OWNER TO postgres;

--
-- Name: fechamento_funcionarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fechamento_funcionarios_id_seq OWNED BY public.fechamento_funcionarios.id;


--
-- Name: fechamento_mensal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fechamento_mensal (
    id integer NOT NULL,
    funcionario_id integer NOT NULL,
    mes integer NOT NULL,
    ano integer NOT NULL,
    total_horas_trabalhadas interval,
    total_horas_extras interval,
    total_atrasos_faltas interval,
    valor_dsr numeric(10,2) DEFAULT 0.00,
    status public.status_espelho DEFAULT 'Em_Aberto'::public.status_espelho,
    assinado_em timestamp without time zone,
    observacao_funcionario text,
    CONSTRAINT fechamento_mensal_mes_check CHECK (((mes >= 1) AND (mes <= 12)))
);


ALTER TABLE public.fechamento_mensal OWNER TO postgres;

--
-- Name: fechamento_mensal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fechamento_mensal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fechamento_mensal_id_seq OWNER TO postgres;

--
-- Name: fechamento_mensal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fechamento_mensal_id_seq OWNED BY public.fechamento_mensal.id;


--
-- Name: fechamento_resumo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fechamento_resumo (
    id integer NOT NULL,
    fechamento_id integer NOT NULL,
    funcionario_id integer NOT NULL,
    horas_previstas interval,
    horas_trabalhadas interval,
    horas_extras interval,
    horas_faltantes interval,
    atrasos integer DEFAULT 0,
    faltas integer DEFAULT 0,
    banco_horas interval,
    salario_base numeric(10,2),
    valor_horas_extras numeric(10,2),
    valor_descontos numeric(10,2),
    criado_em timestamp without time zone DEFAULT now(),
    status character varying(30) DEFAULT 'PENDENTE'::character varying,
    observacoes text
);


ALTER TABLE public.fechamento_resumo OWNER TO postgres;

--
-- Name: fechamento_resumo_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fechamento_resumo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fechamento_resumo_id_seq OWNER TO postgres;

--
-- Name: fechamento_resumo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fechamento_resumo_id_seq OWNED BY public.fechamento_resumo.id;


--
-- Name: fechamentos_ponto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fechamentos_ponto (
    id integer NOT NULL,
    mes integer NOT NULL,
    ano integer NOT NULL,
    data_inicio date NOT NULL,
    data_fim date NOT NULL,
    status character varying(30) DEFAULT 'ABERTO'::character varying,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.fechamentos_ponto OWNER TO postgres;

--
-- Name: fechamentos_ponto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fechamentos_ponto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fechamentos_ponto_id_seq OWNER TO postgres;

--
-- Name: fechamentos_ponto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fechamentos_ponto_id_seq OWNED BY public.fechamentos_ponto.id;


--
-- Name: folha_funcionarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folha_funcionarios (
    id integer NOT NULL,
    folha_id integer,
    funcionario_id integer,
    salario_base numeric(10,2) DEFAULT 0,
    horas_extras numeric(10,2) DEFAULT 0,
    valor_horas_extras numeric(10,2) DEFAULT 0,
    faltas numeric(10,2) DEFAULT 0,
    valor_faltas numeric(10,2) DEFAULT 0,
    inss numeric(10,2) DEFAULT 0,
    irrf numeric(10,2) DEFAULT 0,
    fgts numeric(10,2) DEFAULT 0,
    total_bruto numeric(10,2) DEFAULT 0,
    total_descontos numeric(10,2) DEFAULT 0,
    total_liquido numeric(10,2) DEFAULT 0
);


ALTER TABLE public.folha_funcionarios OWNER TO postgres;

--
-- Name: folha_funcionarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.folha_funcionarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.folha_funcionarios_id_seq OWNER TO postgres;

--
-- Name: folha_funcionarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.folha_funcionarios_id_seq OWNED BY public.folha_funcionarios.id;


--
-- Name: folhas_pagamento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folhas_pagamento (
    id integer NOT NULL,
    competencia_mes integer NOT NULL,
    competencia_ano integer NOT NULL,
    fechamento_id integer,
    data_geracao timestamp without time zone DEFAULT now(),
    status character varying(20) DEFAULT 'ABERTA'::character varying,
    total_bruto numeric(12,2) DEFAULT 0,
    total_descontos numeric(12,2) DEFAULT 0,
    total_liquido numeric(12,2) DEFAULT 0
);


ALTER TABLE public.folhas_pagamento OWNER TO postgres;

--
-- Name: folhas_pagamento_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.folhas_pagamento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.folhas_pagamento_id_seq OWNER TO postgres;

--
-- Name: folhas_pagamento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.folhas_pagamento_id_seq OWNED BY public.folhas_pagamento.id;


--
-- Name: funcionarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.funcionarios (
    id integer NOT NULL,
    nome character varying(100) NOT NULL,
    cpf character varying(14) NOT NULL,
    cargo character varying(50),
    salario_base numeric(10,2),
    grupo_id integer,
    data_admissao date,
    pis_pasep character varying(20),
    raio_social_empresa character varying(150),
    cnpj_empresa character varying(18),
    banco_nome character varying(50),
    banco_agencia character varying(10),
    banco_conta character varying(20),
    banco character varying(50),
    conta_bancaria character varying(20),
    rg character varying(20),
    departamento character varying(100),
    data_nascimento date,
    tipo_contrato character varying(50),
    agencia character varying(20),
    pix character varying(100),
    telefone character varying(20),
    email character varying(100),
    cargo_id integer,
    ativo boolean DEFAULT true,
    data_demissao date,
    foto text,
    ctps character varying(100),
    dependentes integer DEFAULT 0,
    carga_horaria_mensal integer DEFAULT 220,
    optante_vt character varying(10) DEFAULT 'SIM'::character varying,
    adicional_tipo character varying(50) DEFAULT 'NENHUM'::character varying,
    foto_url character varying(255)
);


ALTER TABLE public.funcionarios OWNER TO postgres;

--
-- Name: funcionarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.funcionarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.funcionarios_id_seq OWNER TO postgres;

--
-- Name: funcionarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.funcionarios_id_seq OWNED BY public.funcionarios.id;


--
-- Name: grupos_jornada; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupos_jornada (
    id integer NOT NULL,
    nome_grupo character varying(100) NOT NULL,
    entrada_manha time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    saida_almoco time without time zone DEFAULT '12:00:00'::time without time zone NOT NULL,
    retorno_almoco time without time zone DEFAULT '13:00:00'::time without time zone NOT NULL,
    saida_tarde time without time zone DEFAULT '18:00:00'::time without time zone NOT NULL
);


ALTER TABLE public.grupos_jornada OWNER TO postgres;

--
-- Name: grupos_jornada_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grupos_jornada_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grupos_jornada_id_seq OWNER TO postgres;

--
-- Name: grupos_jornada_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grupos_jornada_id_seq OWNED BY public.grupos_jornada.id;


--
-- Name: holerites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holerites (
    id integer NOT NULL,
    funcionario_id integer NOT NULL,
    fechamento_id integer NOT NULL,
    mes integer NOT NULL,
    ano integer NOT NULL,
    salario_base numeric(10,2) NOT NULL,
    total_proventos numeric(10,2) NOT NULL,
    total_descontos numeric(10,2) NOT NULL,
    salario_liquido numeric(10,2) NOT NULL,
    detalhamento_json jsonb,
    pdf_url character varying(255),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.holerites OWNER TO postgres;

--
-- Name: holerites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.holerites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.holerites_id_seq OWNER TO postgres;

--
-- Name: holerites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.holerites_id_seq OWNED BY public.holerites.id;


--
-- Name: notificacoes_leituras; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notificacoes_leituras (
    id integer NOT NULL,
    notificacao_id integer NOT NULL,
    funcionario_id integer NOT NULL,
    lido boolean DEFAULT false,
    lido_em timestamp without time zone
);


ALTER TABLE public.notificacoes_leituras OWNER TO postgres;

--
-- Name: notificacoes_leituras_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notificacoes_leituras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notificacoes_leituras_id_seq OWNER TO postgres;

--
-- Name: notificacoes_leituras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notificacoes_leituras_id_seq OWNED BY public.notificacoes_leituras.id;


--
-- Name: notificacoes_rh; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notificacoes_rh (
    id integer NOT NULL,
    titulo character varying(150) NOT NULL,
    mensagem text NOT NULL,
    tipo public.tipo_notificacao DEFAULT 'Informativo'::public.tipo_notificacao,
    para_todos boolean DEFAULT true,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notificacoes_rh OWNER TO postgres;

--
-- Name: notificacoes_rh_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notificacoes_rh_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notificacoes_rh_id_seq OWNER TO postgres;

--
-- Name: notificacoes_rh_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notificacoes_rh_id_seq OWNED BY public.notificacoes_rh.id;


--
-- Name: registros_ponto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registros_ponto (
    id integer NOT NULL,
    funcionario_id integer,
    data_hora timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    coordenadas character varying(100),
    status_validacao character varying(20) NOT NULL,
    hora_entrada time without time zone,
    hora_saida time without time zone,
    data_registro date DEFAULT CURRENT_DATE,
    tipo_registro character varying(30),
    origem character varying(20) DEFAULT 'APP'::character varying,
    observacao text
);


ALTER TABLE public.registros_ponto OWNER TO postgres;

--
-- Name: registros_ponto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registros_ponto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registros_ponto_id_seq OWNER TO postgres;

--
-- Name: registros_ponto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registros_ponto_id_seq OWNED BY public.registros_ponto.id;


--
-- Name: solicitacoes_ponto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitacoes_ponto (
    id integer NOT NULL,
    funcionario_id integer NOT NULL,
    data_registro date NOT NULL,
    tipo_solicitacao character varying(50) NOT NULL,
    hora_entrada time without time zone,
    hora_saida_almoco time without time zone,
    hora_volta_almoco time without time zone,
    hora_saida time without time zone,
    justificativa text NOT NULL,
    comprovante_url character varying(255),
    status public.status_solicitacao DEFAULT 'Pendente'::public.status_solicitacao,
    resposta_rh text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    anexo_url text
);


ALTER TABLE public.solicitacoes_ponto OWNER TO postgres;

--
-- Name: solicitacoes_ponto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.solicitacoes_ponto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.solicitacoes_ponto_id_seq OWNER TO postgres;

--
-- Name: solicitacoes_ponto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.solicitacoes_ponto_id_seq OWNED BY public.solicitacoes_ponto.id;


--
-- Name: solicitacoes_vale; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitacoes_vale (
    id integer NOT NULL,
    funcionario_id integer NOT NULL,
    valor numeric(10,2) NOT NULL,
    motivo text,
    data_solicitacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(30) DEFAULT 'PENDENTE_RH'::character varying,
    motivo_recusa text,
    data_aprovacao_rh timestamp without time zone,
    data_pagamento_financeiro timestamp without time zone,
    competencia_mes integer NOT NULL,
    competencia_ano integer NOT NULL,
    descontado_folha boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.solicitacoes_vale OWNER TO postgres;

--
-- Name: solicitacoes_vale_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.solicitacoes_vale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.solicitacoes_vale_id_seq OWNER TO postgres;

--
-- Name: solicitacoes_vale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.solicitacoes_vale_id_seq OWNED BY public.solicitacoes_vale.id;


--
-- Name: vales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vales (
    id integer NOT NULL,
    funcionario_id integer,
    valor numeric(10,2) NOT NULL,
    data_solicitacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    competencia_mes integer NOT NULL,
    competencia_ano integer NOT NULL,
    justificativa text,
    status character varying(50) DEFAULT 'Pendente'::character varying,
    resposta_rh text,
    data_resposta timestamp without time zone
);


ALTER TABLE public.vales OWNER TO postgres;

--
-- Name: vales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vales_id_seq OWNER TO postgres;

--
-- Name: vales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vales_id_seq OWNED BY public.vales.id;


--
-- Name: cargos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cargos ALTER COLUMN id SET DEFAULT nextval('public.cargos_id_seq'::regclass);


--
-- Name: cbo id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cbo ALTER COLUMN id SET DEFAULT nextval('public.cbo_id_seq'::regclass);


--
-- Name: configuracoes_empresa id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracoes_empresa ALTER COLUMN id SET DEFAULT nextval('public.configuracoes_empresa_id_seq'::regclass);


--
-- Name: empresa id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa ALTER COLUMN id SET DEFAULT nextval('public.empresa_id_seq'::regclass);


--
-- Name: fechamento_funcionarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_funcionarios ALTER COLUMN id SET DEFAULT nextval('public.fechamento_funcionarios_id_seq'::regclass);


--
-- Name: fechamento_mensal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_mensal ALTER COLUMN id SET DEFAULT nextval('public.fechamento_mensal_id_seq'::regclass);


--
-- Name: fechamento_resumo id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_resumo ALTER COLUMN id SET DEFAULT nextval('public.fechamento_resumo_id_seq'::regclass);


--
-- Name: fechamentos_ponto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamentos_ponto ALTER COLUMN id SET DEFAULT nextval('public.fechamentos_ponto_id_seq'::regclass);


--
-- Name: folha_funcionarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folha_funcionarios ALTER COLUMN id SET DEFAULT nextval('public.folha_funcionarios_id_seq'::regclass);


--
-- Name: folhas_pagamento id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folhas_pagamento ALTER COLUMN id SET DEFAULT nextval('public.folhas_pagamento_id_seq'::regclass);


--
-- Name: funcionarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.funcionarios ALTER COLUMN id SET DEFAULT nextval('public.funcionarios_id_seq'::regclass);


--
-- Name: grupos_jornada id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_jornada ALTER COLUMN id SET DEFAULT nextval('public.grupos_jornada_id_seq'::regclass);


--
-- Name: holerites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holerites ALTER COLUMN id SET DEFAULT nextval('public.holerites_id_seq'::regclass);


--
-- Name: notificacoes_leituras id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificacoes_leituras ALTER COLUMN id SET DEFAULT nextval('public.notificacoes_leituras_id_seq'::regclass);


--
-- Name: notificacoes_rh id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificacoes_rh ALTER COLUMN id SET DEFAULT nextval('public.notificacoes_rh_id_seq'::regclass);


--
-- Name: registros_ponto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_ponto ALTER COLUMN id SET DEFAULT nextval('public.registros_ponto_id_seq'::regclass);


--
-- Name: solicitacoes_ponto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacoes_ponto ALTER COLUMN id SET DEFAULT nextval('public.solicitacoes_ponto_id_seq'::regclass);


--
-- Name: solicitacoes_vale id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacoes_vale ALTER COLUMN id SET DEFAULT nextval('public.solicitacoes_vale_id_seq'::regclass);


--
-- Name: vales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vales ALTER COLUMN id SET DEFAULT nextval('public.vales_id_seq'::regclass);


--
-- Name: cargos cargos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT cargos_pkey PRIMARY KEY (id);


--
-- Name: cbo cbo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cbo
    ADD CONSTRAINT cbo_pkey PRIMARY KEY (id);


--
-- Name: configuracoes_empresa configuracoes_empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracoes_empresa
    ADD CONSTRAINT configuracoes_empresa_pkey PRIMARY KEY (id);


--
-- Name: empresa empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT empresa_pkey PRIMARY KEY (id);


--
-- Name: fechamento_funcionarios fechamento_funcionarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_funcionarios
    ADD CONSTRAINT fechamento_funcionarios_pkey PRIMARY KEY (id);


--
-- Name: fechamento_mensal fechamento_mensal_funcionario_id_mes_ano_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_mensal
    ADD CONSTRAINT fechamento_mensal_funcionario_id_mes_ano_key UNIQUE (funcionario_id, mes, ano);


--
-- Name: fechamento_mensal fechamento_mensal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_mensal
    ADD CONSTRAINT fechamento_mensal_pkey PRIMARY KEY (id);


--
-- Name: fechamento_resumo fechamento_resumo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_resumo
    ADD CONSTRAINT fechamento_resumo_pkey PRIMARY KEY (id);


--
-- Name: fechamentos_ponto fechamentos_ponto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamentos_ponto
    ADD CONSTRAINT fechamentos_ponto_pkey PRIMARY KEY (id);


--
-- Name: folha_funcionarios folha_funcionarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folha_funcionarios
    ADD CONSTRAINT folha_funcionarios_pkey PRIMARY KEY (id);


--
-- Name: folhas_pagamento folhas_pagamento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folhas_pagamento
    ADD CONSTRAINT folhas_pagamento_pkey PRIMARY KEY (id);


--
-- Name: funcionarios funcionarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_pkey PRIMARY KEY (id);


--
-- Name: grupos_jornada grupos_jornada_nome_grupo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_jornada
    ADD CONSTRAINT grupos_jornada_nome_grupo_key UNIQUE (nome_grupo);


--
-- Name: grupos_jornada grupos_jornada_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_jornada
    ADD CONSTRAINT grupos_jornada_pkey PRIMARY KEY (id);


--
-- Name: holerites holerites_funcionario_id_mes_ano_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holerites
    ADD CONSTRAINT holerites_funcionario_id_mes_ano_key UNIQUE (funcionario_id, mes, ano);


--
-- Name: holerites holerites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holerites
    ADD CONSTRAINT holerites_pkey PRIMARY KEY (id);


--
-- Name: notificacoes_leituras notificacoes_leituras_notificacao_id_funcionario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificacoes_leituras
    ADD CONSTRAINT notificacoes_leituras_notificacao_id_funcionario_id_key UNIQUE (notificacao_id, funcionario_id);


--
-- Name: notificacoes_leituras notificacoes_leituras_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificacoes_leituras
    ADD CONSTRAINT notificacoes_leituras_pkey PRIMARY KEY (id);


--
-- Name: notificacoes_rh notificacoes_rh_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificacoes_rh
    ADD CONSTRAINT notificacoes_rh_pkey PRIMARY KEY (id);


--
-- Name: registros_ponto registros_ponto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_ponto
    ADD CONSTRAINT registros_ponto_pkey PRIMARY KEY (id);


--
-- Name: solicitacoes_ponto solicitacoes_ponto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacoes_ponto
    ADD CONSTRAINT solicitacoes_ponto_pkey PRIMARY KEY (id);


--
-- Name: solicitacoes_vale solicitacoes_vale_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacoes_vale
    ADD CONSTRAINT solicitacoes_vale_pkey PRIMARY KEY (id);


--
-- Name: vales vales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vales
    ADD CONSTRAINT vales_pkey PRIMARY KEY (id);


--
-- Name: cbo_codigo_unq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cbo_codigo_unq ON public.cbo USING btree (codigo);


--
-- Name: funcionarios_cpf_unico; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX funcionarios_cpf_unico ON public.funcionarios USING btree (cpf) WHERE ((cpf IS NOT NULL) AND ((cpf)::text <> ''::text));


--
-- Name: idx_registros_ponto_funcionario_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registros_ponto_funcionario_data ON public.registros_ponto USING btree (funcionario_id, data_registro);


--
-- Name: idx_vale_competencia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vale_competencia ON public.solicitacoes_vale USING btree (competencia_mes, competencia_ano);


--
-- Name: idx_vale_funcionario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vale_funcionario ON public.solicitacoes_vale USING btree (funcionario_id);


--
-- Name: idx_vale_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vale_status ON public.solicitacoes_vale USING btree (status);


--
-- Name: fechamento_mensal fechamento_mensal_funcionario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_mensal
    ADD CONSTRAINT fechamento_mensal_funcionario_id_fkey FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id) ON DELETE CASCADE;


--
-- Name: fechamento_resumo fechamento_resumo_fechamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_resumo
    ADD CONSTRAINT fechamento_resumo_fechamento_id_fkey FOREIGN KEY (fechamento_id) REFERENCES public.fechamentos_ponto(id);


--
-- Name: fechamento_resumo fechamento_resumo_funcionario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_resumo
    ADD CONSTRAINT fechamento_resumo_funcionario_id_fkey FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id);


--
-- Name: cargos fk_cargos_cbo; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT fk_cargos_cbo FOREIGN KEY (cbo_id) REFERENCES public.cbo(id);


--
-- Name: fechamento_funcionarios fk_fechamento; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_funcionarios
    ADD CONSTRAINT fk_fechamento FOREIGN KEY (fechamento_id) REFERENCES public.fechamentos_ponto(id);


--
-- Name: fechamento_funcionarios fk_funcionario; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fechamento_funcionarios
    ADD CONSTRAINT fk_funcionario FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id);


--
-- Name: funcionarios fk_funcionarios_cargos; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT fk_funcionarios_cargos FOREIGN KEY (cargo_id) REFERENCES public.cargos(id);


--
-- Name: folha_funcionarios folha_funcionarios_folha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folha_funcionarios
    ADD CONSTRAINT folha_funcionarios_folha_id_fkey FOREIGN KEY (folha_id) REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE;


--
-- Name: folha_funcionarios folha_funcionarios_funcionario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folha_funcionarios
    ADD CONSTRAINT folha_funcionarios_funcionario_id_fkey FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id);


--
-- Name: folhas_pagamento folhas_pagamento_fechamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folhas_pagamento
    ADD CONSTRAINT folhas_pagamento_fechamento_id_fkey FOREIGN KEY (fechamento_id) REFERENCES public.fechamentos_ponto(id);


--
-- Name: holerites holerites_fechamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holerites
    ADD CONSTRAINT holerites_fechamento_id_fkey FOREIGN KEY (fechamento_id) REFERENCES public.fechamento_mensal(id) ON DELETE CASCADE;


--
-- Name: holerites holerites_funcionario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holerites
    ADD CONSTRAINT holerites_funcionario_id_fkey FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id) ON DELETE CASCADE;


--
-- Name: notificacoes_leituras notificacoes_leituras_funcionario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificacoes_leituras
    ADD CONSTRAINT notificacoes_leituras_funcionario_id_fkey FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id) ON DELETE CASCADE;


--
-- Name: notificacoes_leituras notificacoes_leituras_notificacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificacoes_leituras
    ADD CONSTRAINT notificacoes_leituras_notificacao_id_fkey FOREIGN KEY (notificacao_id) REFERENCES public.notificacoes_rh(id) ON DELETE CASCADE;


--
-- Name: registros_ponto registros_ponto_funcionario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_ponto
    ADD CONSTRAINT registros_ponto_funcionario_id_fkey FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id) ON DELETE CASCADE;


--
-- Name: solicitacoes_ponto solicitacoes_ponto_funcionario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacoes_ponto
    ADD CONSTRAINT solicitacoes_ponto_funcionario_id_fkey FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id) ON DELETE CASCADE;


--
-- Name: solicitacoes_vale solicitacoes_vale_funcionario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacoes_vale
    ADD CONSTRAINT solicitacoes_vale_funcionario_id_fkey FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id) ON DELETE CASCADE;


--
-- Name: vales vales_funcionario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vales
    ADD CONSTRAINT vales_funcionario_id_fkey FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7Ai0n44bY2ytgWCuVBYpmUSqTHjVudCpkAbHnITyV1l85HgJ4cIVSRUIYYF5Fh8

