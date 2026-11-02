--
-- PostgreSQL database dump
--

\restrict FoXhTa0RfhaxzrAFdKGRrJUDJiZ439mg3BI09rvcBPacnJt01Q8BEkKaOVes8B9

-- Dumped from database version 16.15 (Debian 16.15-1.pgdg13+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public."StockMovement" DROP CONSTRAINT "StockMovement_itemId_fkey";
ALTER TABLE ONLY public."Sale" DROP CONSTRAINT "Sale_customerId_fkey";
ALTER TABLE ONLY public."SaleLine" DROP CONSTRAINT "SaleLine_saleId_fkey";
ALTER TABLE ONLY public."SaleLine" DROP CONSTRAINT "SaleLine_itemId_fkey";
ALTER TABLE ONLY public."Purchase" DROP CONSTRAINT "Purchase_vendorId_fkey";
ALTER TABLE ONLY public."PurchaseLine" DROP CONSTRAINT "PurchaseLine_purchaseId_fkey";
ALTER TABLE ONLY public."PurchaseLine" DROP CONSTRAINT "PurchaseLine_itemId_fkey";
ALTER TABLE ONLY public."ProductionBatch" DROP CONSTRAINT "ProductionBatch_productId_fkey";
ALTER TABLE ONLY public."ProductMaterial" DROP CONSTRAINT "ProductMaterial_productId_fkey";
ALTER TABLE ONLY public."ProductMaterial" DROP CONSTRAINT "ProductMaterial_materialId_fkey";
ALTER TABLE ONLY public."Payment" DROP CONSTRAINT "Payment_saleId_fkey";
ALTER TABLE ONLY public."Payment" DROP CONSTRAINT "Payment_purchaseId_fkey";
ALTER TABLE ONLY public."Payment" DROP CONSTRAINT "Payment_partyId_fkey";
ALTER TABLE ONLY public."Payment" DROP CONSTRAINT "Payment_batchId_fkey";
DROP INDEX public."User_email_key";
DROP INDEX public."StockMovement_refType_refId_idx";
DROP INDEX public."StockMovement_itemId_createdAt_idx";
DROP INDEX public."Sale_requestId_key";
DROP INDEX public."Sale_customerId_date_idx";
DROP INDEX public."Purchase_vendorId_date_idx";
DROP INDEX public."Purchase_requestId_key";
DROP INDEX public."ProductionBatch_requestId_key";
DROP INDEX public."ProductMaterial_productId_materialId_key";
DROP INDEX public."Payment_requestId_key";
DROP INDEX public."Payment_date_kind_idx";
DROP INDEX public."Item_name_key";
DROP INDEX public."AuditLog_createdAt_idx";
ALTER TABLE ONLY public."User" DROP CONSTRAINT "User_pkey";
ALTER TABLE ONLY public."StockMovement" DROP CONSTRAINT "StockMovement_pkey";
ALTER TABLE ONLY public."Sale" DROP CONSTRAINT "Sale_pkey";
ALTER TABLE ONLY public."SaleLine" DROP CONSTRAINT "SaleLine_pkey";
ALTER TABLE ONLY public."Purchase" DROP CONSTRAINT "Purchase_pkey";
ALTER TABLE ONLY public."PurchaseLine" DROP CONSTRAINT "PurchaseLine_pkey";
ALTER TABLE ONLY public."ProductionBatch" DROP CONSTRAINT "ProductionBatch_pkey";
ALTER TABLE ONLY public."ProductMaterial" DROP CONSTRAINT "ProductMaterial_pkey";
ALTER TABLE ONLY public."Payment" DROP CONSTRAINT "Payment_pkey";
ALTER TABLE ONLY public."Party" DROP CONSTRAINT "Party_pkey";
ALTER TABLE ONLY public."Item" DROP CONSTRAINT "Item_pkey";
ALTER TABLE ONLY public."AuditLog" DROP CONSTRAINT "AuditLog_pkey";
ALTER TABLE public."StockMovement" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."SaleLine" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Sale" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."PurchaseLine" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Purchase" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."ProductionBatch" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."ProductMaterial" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Payment" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."AuditLog" ALTER COLUMN id DROP DEFAULT;
DROP TABLE public."User";
DROP SEQUENCE public."StockMovement_id_seq";
DROP TABLE public."StockMovement";
DROP SEQUENCE public."Sale_id_seq";
DROP SEQUENCE public."SaleLine_id_seq";
DROP TABLE public."SaleLine";
DROP TABLE public."Sale";
DROP SEQUENCE public."Purchase_id_seq";
DROP SEQUENCE public."PurchaseLine_id_seq";
DROP TABLE public."PurchaseLine";
DROP TABLE public."Purchase";
DROP SEQUENCE public."ProductionBatch_id_seq";
DROP TABLE public."ProductionBatch";
DROP SEQUENCE public."ProductMaterial_id_seq";
DROP TABLE public."ProductMaterial";
DROP SEQUENCE public."Payment_id_seq";
DROP TABLE public."Payment";
DROP TABLE public."Party";
DROP TABLE public."Item";
DROP SEQUENCE public."AuditLog_id_seq";
DROP TABLE public."AuditLog";
DROP TYPE public."Role";
DROP TYPE public."PaymentKind";
DROP TYPE public."PartyType";
DROP TYPE public."MovementReason";
DROP TYPE public."ItemType";
--
-- Name: ItemType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ItemType" AS ENUM (
    'RAW_MATERIAL',
    'FINISHED_GOOD'
);


--
-- Name: MovementReason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MovementReason" AS ENUM (
    'OPENING',
    'PURCHASE',
    'SALE',
    'PRODUCTION_USE',
    'PRODUCTION_OUTPUT',
    'ADJUSTMENT',
    'REVERSAL'
);


--
-- Name: PartyType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PartyType" AS ENUM (
    'VENDOR',
    'CUSTOMER',
    'WORKER'
);


--
-- Name: PaymentKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentKind" AS ENUM (
    'VENDOR_PAYMENT',
    'CUSTOMER_RECEIPT',
    'LABOUR',
    'EXPENSE'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'WORKER'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id integer NOT NULL,
    "userId" text,
    action text NOT NULL,
    entity text,
    "entityId" text,
    detail jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AuditLog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AuditLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AuditLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AuditLog_id_seq" OWNED BY public."AuditLog".id;


--
-- Name: Item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Item" (
    id text NOT NULL,
    name text NOT NULL,
    type public."ItemType" NOT NULL,
    unit text NOT NULL,
    "minStock" numeric(14,3) DEFAULT 0 NOT NULL,
    "sellingPrice" numeric(14,2),
    "qtyOnHand" numeric(14,3) DEFAULT 0 NOT NULL,
    "avgCost" numeric(14,4) DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT item_qty_not_negative CHECK (("qtyOnHand" >= (0)::numeric))
);


--
-- Name: Party; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Party" (
    id text NOT NULL,
    name text NOT NULL,
    type public."PartyType" NOT NULL,
    phone text,
    "openingBalance" numeric(14,2) DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payment" (
    id integer NOT NULL,
    "requestId" text NOT NULL,
    kind public."PaymentKind" NOT NULL,
    "partyId" text,
    amount numeric(14,2) NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    note text,
    "purchaseId" integer,
    "saleId" integer,
    "batchId" integer,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "cancelReason" text,
    CONSTRAINT payment_amount_positive CHECK ((amount > (0)::numeric))
);


--
-- Name: Payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Payment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Payment_id_seq" OWNED BY public."Payment".id;


--
-- Name: ProductMaterial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductMaterial" (
    id integer NOT NULL,
    "productId" text NOT NULL,
    "materialId" text NOT NULL
);


--
-- Name: ProductMaterial_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ProductMaterial_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ProductMaterial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ProductMaterial_id_seq" OWNED BY public."ProductMaterial".id;


--
-- Name: ProductionBatch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductionBatch" (
    id integer NOT NULL,
    "requestId" text NOT NULL,
    "productId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "qtyProduced" numeric(14,3) NOT NULL,
    "qtyRejected" numeric(14,3) DEFAULT 0 NOT NULL,
    "materialCost" numeric(14,2) NOT NULL,
    "labourCost" numeric(14,2) NOT NULL,
    "otherCost" numeric(14,2) NOT NULL,
    "costPerUnit" numeric(14,4) NOT NULL,
    note text,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "cancelReason" text
);


--
-- Name: ProductionBatch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ProductionBatch_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ProductionBatch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ProductionBatch_id_seq" OWNED BY public."ProductionBatch".id;


--
-- Name: Purchase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Purchase" (
    id integer NOT NULL,
    "requestId" text NOT NULL,
    "vendorId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "refNo" text,
    total numeric(14,2) NOT NULL,
    note text,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "cancelReason" text
);


--
-- Name: PurchaseLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PurchaseLine" (
    id integer NOT NULL,
    "purchaseId" integer NOT NULL,
    "itemId" text NOT NULL,
    qty numeric(14,3) NOT NULL,
    rate numeric(14,4) NOT NULL,
    amount numeric(14,2) NOT NULL,
    CONSTRAINT purchaseline_qty_positive CHECK ((qty > (0)::numeric))
);


--
-- Name: PurchaseLine_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PurchaseLine_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PurchaseLine_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PurchaseLine_id_seq" OWNED BY public."PurchaseLine".id;


--
-- Name: Purchase_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Purchase_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Purchase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Purchase_id_seq" OWNED BY public."Purchase".id;


--
-- Name: Sale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Sale" (
    id integer NOT NULL,
    "requestId" text NOT NULL,
    "customerId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    total numeric(14,2) NOT NULL,
    note text,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "cancelReason" text
);


--
-- Name: SaleLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SaleLine" (
    id integer NOT NULL,
    "saleId" integer NOT NULL,
    "itemId" text NOT NULL,
    qty numeric(14,3) NOT NULL,
    rate numeric(14,4) NOT NULL,
    amount numeric(14,2) NOT NULL,
    "costAtSale" numeric(14,4) NOT NULL,
    CONSTRAINT saleline_qty_positive CHECK ((qty > (0)::numeric))
);


--
-- Name: SaleLine_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."SaleLine_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SaleLine_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."SaleLine_id_seq" OWNED BY public."SaleLine".id;


--
-- Name: Sale_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Sale_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Sale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Sale_id_seq" OWNED BY public."Sale".id;


--
-- Name: StockMovement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockMovement" (
    id integer NOT NULL,
    "itemId" text NOT NULL,
    reason public."MovementReason" NOT NULL,
    "qtyChange" numeric(14,3) NOT NULL,
    "qtyBefore" numeric(14,3) NOT NULL,
    "qtyAfter" numeric(14,3) NOT NULL,
    "unitCost" numeric(14,4) NOT NULL,
    "refType" text,
    "refId" text,
    note text,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StockMovement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."StockMovement_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: StockMovement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."StockMovement_id_seq" OWNED BY public."StockMovement".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."Role" DEFAULT 'WORKER'::public."Role" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AuditLog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog" ALTER COLUMN id SET DEFAULT nextval('public."AuditLog_id_seq"'::regclass);


--
-- Name: Payment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment" ALTER COLUMN id SET DEFAULT nextval('public."Payment_id_seq"'::regclass);


--
-- Name: ProductMaterial id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductMaterial" ALTER COLUMN id SET DEFAULT nextval('public."ProductMaterial_id_seq"'::regclass);


--
-- Name: ProductionBatch id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionBatch" ALTER COLUMN id SET DEFAULT nextval('public."ProductionBatch_id_seq"'::regclass);


--
-- Name: Purchase id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Purchase" ALTER COLUMN id SET DEFAULT nextval('public."Purchase_id_seq"'::regclass);


--
-- Name: PurchaseLine id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseLine" ALTER COLUMN id SET DEFAULT nextval('public."PurchaseLine_id_seq"'::regclass);


--
-- Name: Sale id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sale" ALTER COLUMN id SET DEFAULT nextval('public."Sale_id_seq"'::regclass);


--
-- Name: SaleLine id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SaleLine" ALTER COLUMN id SET DEFAULT nextval('public."SaleLine_id_seq"'::regclass);


--
-- Name: StockMovement id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement" ALTER COLUMN id SET DEFAULT nextval('public."StockMovement_id_seq"'::regclass);


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, "userId", action, entity, "entityId", detail, "createdAt") FROM stdin;
1	cmvy5zjnc0000asnv2ds78f9s	LOGIN	\N	\N	\N	2026-11-01 18:30:26.08
2	cmvy5zjnc0000asnv2ds78f9s	MAPPING_UPDATE	Item	cmvy5zjpa0004asnvnnnduzfh	{"materials": ["Flour", "Sugar"]}	2026-11-01 18:31:15.677
3	cmvy5zjox0001asnvmxpalx9n	LOGIN	\N	\N	\N	2026-11-01 18:33:34.296
4	cmvy5zjnc0000asnv2ds78f9s	LOGIN	\N	\N	\N	2026-11-01 18:34:38.783
\.


--
-- Data for Name: Item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Item" (id, name, type, unit, "minStock", "sellingPrice", "qtyOnHand", "avgCost", active) FROM stdin;
cmvy5zjpa0004asnvnnnduzfh	Biscuit pack	FINISHED_GOOD	piece	0.000	30.00	0.000	0.0000	t
cmvy6fgzz000b22p7r8mqn8kq	Premium Assorted	FINISHED_GOOD	box	0.000	120.00	70.000	62.2200	t
cmvy6fgzq000522p79jxyaxfv	Cocoa Powder	RAW_MATERIAL	kg	15.000	\N	65.000	131.7200	t
cmvy6fgzr000622p75w9nngm6	Sesame Seeds	RAW_MATERIAL	kg	10.000	\N	44.000	91.6471	t
cmvy5zjp50002asnv6i4djglc	Flour	RAW_MATERIAL	kg	50.000	\N	830.000	44.0685	t
cmvy5zjp80003asnvl2a9heiq	Sugar	RAW_MATERIAL	kg	10.000	\N	637.000	152.3587	t
cmvy6fgzn000422p7jw8o35ou	Butter	RAW_MATERIAL	kg	20.000	\N	256.000	84.4190	t
cmvy6fgzs000722p73awvnkju	Packaging Material	RAW_MATERIAL	roll	5.000	\N	34.000	152.0176	t
cmvy6fgzu000822p7olxczett	Butter Biscuit	FINISHED_GOOD	pack	0.000	30.00	470.000	31.0297	t
cmvy6fgzw000922p7svi8h8ei	Choco Biscuit	FINISHED_GOOD	pack	0.000	40.00	5.000	40.9716	t
cmvy6fgzx000a22p77rspb444	Sesame Cracker	FINISHED_GOOD	pack	0.000	25.00	1.000	25.0301	t
\.


--
-- Data for Name: Party; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Party" (id, name, type, phone, "openingBalance", active) FROM stdin;
cmvy5zjph0005asnvypf6j26l	Vendor A (flour)	VENDOR	\N	0.00	t
cmvy5zjpi0006asnvulx367rq	Vendor B (sugar)	VENDOR	\N	0.00	t
cmvy5zjpi0007asnvgpzzulwh	Customer C	CUSTOMER	\N	0.00	t
cmvy5zjpj0008asnv5bftpn6h	Ramesh (team)	WORKER	\N	0.00	t
cmvy6fh0m000c22p7udxmlhqv	Agro Flour Mills	VENDOR	9812340001	5000.00	t
cmvy6fh0n000d22p7ay04uc7m	Sweet Cane Traders	VENDOR	9812340002	2000.00	t
cmvy6fh0o000e22p7h4o3w4kj	Dairy Delights Co.	VENDOR	9812340003	0.00	t
cmvy6fh0o000f22p7niknfs0y	Sharma General Store	CUSTOMER	9900001111	1200.00	t
cmvy6fh0p000g22p7nipaqoei	Patel Kirana House	CUSTOMER	9900002222	800.00	t
cmvy6fh0q000h22p73q9ycafb	Metro Supermarket	CUSTOMER	9900003333	0.00	t
cmvy6fh0q000i22p7r8hungmy	QuickMart Retail	CUSTOMER	9900004444	0.00	t
cmvy6fh0r000j22p740dehlxc	Gupta Brothers	CUSTOMER	9900005555	500.00	t
cmvy6fh0r000k22p7henjamrr	Sunrise Exports	CUSTOMER	9900006666	0.00	t
cmvy6fh0s000l22p7s13m1s5r	Ramesh Kumar	WORKER	9700001111	0.00	t
cmvy6fh0t000m22p7jwhdeen5	Suresh Yadav	WORKER	9700002222	0.00	t
cmvy6fh0t000n22p74ftjbfjx	Lakshmi Devi	WORKER	9700003333	0.00	t
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Payment" (id, "requestId", kind, "partyId", amount, date, note, "purchaseId", "saleId", "batchId", "createdById", "createdAt", "cancelledAt", "cancelReason") FROM stdin;
1	f37f33d5-a576-4877-8fad-5439b1672e85:pay	VENDOR_PAYMENT	cmvy5zjpi0006asnvulx367rq	80000.00	2026-11-02 00:00:00	\N	1	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:32:41.817	\N	\N
2	040c8532-1b32-40eb-b4e2-b51aed3a5e46	LABOUR	cmvy5zjpj0008asnv5bftpn6h	100000.00	2026-11-02 00:00:00	\N	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:35:18.408	\N	\N
3	demo2-pur-01:pay	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	8000.00	2026-05-30 00:00:00	\N	2	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.13	\N	\N
4	demo2-pur-02:pay	VENDOR_PAYMENT	cmvy6fh0n000d22p7ay04uc7m	2500.00	2026-06-02 00:00:00	\N	3	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.136	\N	\N
5	demo2-pur-03:pay	VENDOR_PAYMENT	cmvy6fh0o000e22p7h4o3w4kj	3200.00	2026-06-04 00:00:00	\N	4	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.141	\N	\N
6	demo2-pur-04:pay	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	9000.00	2026-07-04 00:00:00	\N	5	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.148	\N	\N
7	demo2-pur-05:pay	VENDOR_PAYMENT	cmvy6fh0n000d22p7ay04uc7m	3000.00	2026-07-06 00:00:00	\N	6	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.153	\N	\N
8	demo2-pur-06:pay	VENDOR_PAYMENT	cmvy6fh0o000e22p7h4o3w4kj	5500.00	2026-07-09 00:00:00	\N	7	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.159	\N	\N
9	demo2-pur-07:pay	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	2000.00	2026-07-14 00:00:00	\N	8	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.163	\N	\N
10	demo2-pur-08:pay	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	12000.00	2026-08-03 00:00:00	\N	9	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.167	\N	\N
11	demo2-pur-09:pay	VENDOR_PAYMENT	cmvy6fh0n000d22p7ay04uc7m	4000.00	2026-08-05 00:00:00	\N	10	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.172	\N	\N
12	demo2-pur-10:pay	VENDOR_PAYMENT	cmvy6fh0o000e22p7h4o3w4kj	7200.00	2026-08-08 00:00:00	\N	11	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.177	\N	\N
13	demo2-pur-11:pay	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	1800.00	2026-08-11 00:00:00	\N	12	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.181	\N	\N
14	demo2-pur-12:pay	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	2100.00	2026-08-13 00:00:00	\N	13	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.185	\N	\N
15	demo2-pur-13:pay	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	10000.00	2026-08-31 00:00:00	\N	14	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.189	\N	\N
16	demo2-pur-14:pay	VENDOR_PAYMENT	cmvy6fh0n000d22p7ay04uc7m	3500.00	2026-09-02 00:00:00	\N	15	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.194	\N	\N
17	demo2-pur-15:pay	VENDOR_PAYMENT	cmvy6fh0o000e22p7h4o3w4kj	5000.00	2026-09-04 00:00:00	\N	16	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.675	\N	\N
18	demo2-pur-16:pay	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	2800.00	2026-09-07 00:00:00	\N	17	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.682	\N	\N
19	demo2-pur-17:pay	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	11000.00	2026-09-27 00:00:00	\N	18	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.688	\N	\N
20	demo2-pur-18:pay	VENDOR_PAYMENT	cmvy6fh0n000d22p7ay04uc7m	4200.00	2026-09-29 00:00:00	\N	19	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.692	\N	\N
21	demo2-pur-19:pay	VENDOR_PAYMENT	cmvy6fh0o000e22p7h4o3w4kj	7500.00	2026-10-02 00:00:00	\N	20	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.698	\N	\N
22	demo2-pur-20:pay	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	2000.00	2026-10-04 00:00:00	\N	21	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.703	\N	\N
23	demo2-pur-21:pay	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	5000.00	2026-10-18 00:00:00	\N	22	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.708	\N	\N
24	demo2-pur-22:pay	VENDOR_PAYMENT	cmvy6fh0n000d22p7ay04uc7m	2000.00	2026-10-20 00:00:00	\N	23	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.712	\N	\N
25	demo2-pur-23:pay	VENDOR_PAYMENT	cmvy6fh0o000e22p7h4o3w4kj	3000.00	2026-10-22 00:00:00	\N	24	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.716	\N	\N
26	demo2-bat-01:L0	LABOUR	cmvy6fh0s000l22p7s13m1s5r	3000.00	2026-06-06 00:00:00	\N	\N	\N	1	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.736	\N	\N
27	demo2-bat-01:L1	LABOUR	cmvy6fh0t000m22p7jwhdeen5	2500.00	2026-06-06 00:00:00	\N	\N	\N	1	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.736	\N	\N
28	demo2-bat-01:E0	EXPENSE	\N	800.00	2026-06-06 00:00:00	Gas cylinders	\N	\N	1	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.736	\N	\N
29	demo2-bat-02:L0	LABOUR	cmvy6fh0s000l22p7s13m1s5r	2500.00	2026-06-14 00:00:00	\N	\N	\N	2	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.745	\N	\N
30	demo2-bat-02:L1	LABOUR	cmvy6fh0t000n22p74ftjbfjx	2000.00	2026-06-14 00:00:00	\N	\N	\N	2	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.746	\N	\N
31	demo2-bat-02:E0	EXPENSE	\N	600.00	2026-06-14 00:00:00	Electricity	\N	\N	2	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.746	\N	\N
32	demo2-bat-03:L0	LABOUR	cmvy6fh0t000m22p7jwhdeen5	2000.00	2026-06-24 00:00:00	\N	\N	\N	3	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.754	\N	\N
33	demo2-bat-03:L1	LABOUR	cmvy6fh0t000n22p74ftjbfjx	1800.00	2026-06-24 00:00:00	\N	\N	\N	3	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.754	\N	\N
34	demo2-bat-03:E0	EXPENSE	\N	700.00	2026-06-24 00:00:00	Gas cylinders	\N	\N	3	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.754	\N	\N
35	demo2-bat-04:L0	LABOUR	cmvy6fh0s000l22p7s13m1s5r	3500.00	2026-07-24 00:00:00	\N	\N	\N	4	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.761	\N	\N
36	demo2-bat-04:L1	LABOUR	cmvy6fh0t000m22p7jwhdeen5	3000.00	2026-07-24 00:00:00	\N	\N	\N	4	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.762	\N	\N
37	demo2-bat-04:E0	EXPENSE	\N	900.00	2026-07-24 00:00:00	Electricity	\N	\N	4	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.762	\N	\N
38	demo2-bat-04:E1	EXPENSE	\N	400.00	2026-07-24 00:00:00	Maintenance	\N	\N	4	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.762	\N	\N
39	demo2-bat-05:L0	LABOUR	cmvy6fh0s000l22p7s13m1s5r	2000.00	2026-07-29 00:00:00	\N	\N	\N	5	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.772	\N	\N
40	demo2-bat-05:L1	LABOUR	cmvy6fh0t000n22p74ftjbfjx	2000.00	2026-07-29 00:00:00	\N	\N	\N	5	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.772	\N	\N
41	demo2-bat-05:E0	EXPENSE	\N	500.00	2026-07-29 00:00:00	Packaging labels	\N	\N	5	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.772	\N	\N
42	demo2-bat-06:L0	LABOUR	cmvy6fh0s000l22p7s13m1s5r	3000.00	2026-08-23 00:00:00	\N	\N	\N	6	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.78	\N	\N
43	demo2-bat-06:L1	LABOUR	cmvy6fh0t000m22p7jwhdeen5	2800.00	2026-08-23 00:00:00	\N	\N	\N	6	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.781	\N	\N
44	demo2-bat-06:E0	EXPENSE	\N	850.00	2026-08-23 00:00:00	Gas cylinders	\N	\N	6	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.781	\N	\N
45	demo2-bat-06:E1	EXPENSE	\N	700.00	2026-08-23 00:00:00	Electricity	\N	\N	6	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.781	\N	\N
46	demo2-bat-07:L0	LABOUR	cmvy6fh0s000l22p7s13m1s5r	3200.00	2026-09-17 00:00:00	\N	\N	\N	7	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.788	\N	\N
47	demo2-bat-07:L1	LABOUR	cmvy6fh0t000m22p7jwhdeen5	2700.00	2026-09-17 00:00:00	\N	\N	\N	7	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.788	\N	\N
48	demo2-bat-07:E0	EXPENSE	\N	800.00	2026-09-17 00:00:00	Electricity	\N	\N	7	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.789	\N	\N
49	demo2-bat-08:L0	LABOUR	cmvy6fh0t000m22p7jwhdeen5	1800.00	2026-10-07 00:00:00	\N	\N	\N	8	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.795	\N	\N
50	demo2-bat-08:L1	LABOUR	cmvy6fh0t000n22p74ftjbfjx	1600.00	2026-10-07 00:00:00	\N	\N	\N	8	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.796	\N	\N
51	demo2-bat-08:E0	EXPENSE	\N	650.00	2026-10-07 00:00:00	Gas cylinders	\N	\N	8	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.796	\N	\N
52	demo2-bat-09:L0	LABOUR	cmvy6fh0s000l22p7s13m1s5r	1800.00	2026-10-17 00:00:00	\N	\N	\N	9	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.805	\N	\N
53	demo2-bat-09:L1	LABOUR	cmvy6fh0t000n22p74ftjbfjx	1800.00	2026-10-17 00:00:00	\N	\N	\N	9	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.805	\N	\N
54	demo2-bat-09:E0	EXPENSE	\N	450.00	2026-10-17 00:00:00	Packaging labels	\N	\N	9	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.805	\N	\N
55	demo2-bat-10:L0	LABOUR	cmvy6fh0s000l22p7s13m1s5r	2500.00	2026-10-27 00:00:00	\N	\N	\N	10	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.813	\N	\N
56	demo2-bat-10:L1	LABOUR	cmvy6fh0t000m22p7jwhdeen5	2200.00	2026-10-27 00:00:00	\N	\N	\N	10	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.813	\N	\N
57	demo2-bat-10:E0	EXPENSE	\N	750.00	2026-10-27 00:00:00	Electricity	\N	\N	10	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.814	\N	\N
58	demo2-sal-01:pay	CUSTOMER_RECEIPT	cmvy6fh0o000f22p7niknfs0y	2400.00	2026-06-09 00:00:00	\N	\N	1	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.82	\N	\N
59	demo2-sal-02:pay	CUSTOMER_RECEIPT	cmvy6fh0p000g22p7nipaqoei	2000.00	2026-06-11 00:00:00	\N	\N	2	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.824	\N	\N
60	demo2-sal-03:pay	CUSTOMER_RECEIPT	cmvy6fh0q000h22p73q9ycafb	4800.00	2026-06-16 00:00:00	\N	\N	3	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.828	\N	\N
61	demo2-sal-04:pay	CUSTOMER_RECEIPT	cmvy6fh0q000i22p7r8hungmy	1500.00	2026-06-19 00:00:00	\N	\N	4	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.832	\N	\N
62	demo2-sal-05:pay	CUSTOMER_RECEIPT	cmvy6fh0r000j22p740dehlxc	1000.00	2026-06-24 00:00:00	\N	\N	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.836	\N	\N
63	demo2-sal-06:pay	CUSTOMER_RECEIPT	cmvy6fh0o000f22p7niknfs0y	3000.00	2026-07-09 00:00:00	\N	\N	6	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.84	\N	\N
64	demo2-sal-07:pay	CUSTOMER_RECEIPT	cmvy6fh0p000g22p7nipaqoei	2400.00	2026-07-12 00:00:00	\N	\N	7	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.843	\N	\N
65	demo2-sal-08:pay	CUSTOMER_RECEIPT	cmvy6fh0q000h22p73q9ycafb	6000.00	2026-07-14 00:00:00	\N	\N	8	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.848	\N	\N
66	demo2-sal-09:pay	CUSTOMER_RECEIPT	cmvy6fh0r000k22p7henjamrr	3600.00	2026-07-16 00:00:00	\N	\N	9	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.852	\N	\N
67	demo2-sal-10:pay	CUSTOMER_RECEIPT	cmvy6fh0q000i22p7r8hungmy	2000.00	2026-07-19 00:00:00	\N	\N	10	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.855	\N	\N
68	demo2-sal-11:pay	CUSTOMER_RECEIPT	cmvy6fh0r000j22p740dehlxc	1800.00	2026-07-22 00:00:00	\N	\N	11	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.859	\N	\N
69	demo2-sal-12:pay	CUSTOMER_RECEIPT	cmvy6fh0o000f22p7niknfs0y	4500.00	2026-08-05 00:00:00	\N	\N	12	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.862	\N	\N
70	demo2-sal-13:pay	CUSTOMER_RECEIPT	cmvy6fh0p000g22p7nipaqoei	4000.00	2026-08-07 00:00:00	\N	\N	13	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.866	\N	\N
71	demo2-sal-14:pay	CUSTOMER_RECEIPT	cmvy6fh0q000h22p73q9ycafb	8000.00	2026-08-10 00:00:00	\N	\N	14	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.872	\N	\N
72	demo2-sal-15:pay	CUSTOMER_RECEIPT	cmvy6fh0r000k22p7henjamrr	6000.00	2026-08-13 00:00:00	\N	\N	15	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.875	\N	\N
73	demo2-sal-16:pay	CUSTOMER_RECEIPT	cmvy6fh0q000i22p7r8hungmy	3000.00	2026-08-15 00:00:00	\N	\N	16	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.879	\N	\N
74	demo2-sal-17:pay	CUSTOMER_RECEIPT	cmvy6fh0r000j22p740dehlxc	2400.00	2026-08-18 00:00:00	\N	\N	17	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.882	\N	\N
75	demo2-sal-18:pay	CUSTOMER_RECEIPT	cmvy6fh0o000f22p7niknfs0y	3600.00	2026-09-02 00:00:00	\N	\N	18	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.886	\N	\N
76	demo2-sal-19:pay	CUSTOMER_RECEIPT	cmvy6fh0p000g22p7nipaqoei	3200.00	2026-09-04 00:00:00	\N	\N	19	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.889	\N	\N
77	demo2-sal-20:pay	CUSTOMER_RECEIPT	cmvy6fh0q000h22p73q9ycafb	7200.00	2026-09-06 00:00:00	\N	\N	20	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.893	\N	\N
78	demo2-sal-21:pay	CUSTOMER_RECEIPT	cmvy6fh0r000k22p7henjamrr	4800.00	2026-09-09 00:00:00	\N	\N	21	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.897	\N	\N
79	demo2-sal-22:pay	CUSTOMER_RECEIPT	cmvy6fh0q000i22p7r8hungmy	2500.00	2026-09-12 00:00:00	\N	\N	22	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.9	\N	\N
80	demo2-sal-23:pay	CUSTOMER_RECEIPT	cmvy6fh0r000j22p740dehlxc	1200.00	2026-09-14 00:00:00	\N	\N	23	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.904	\N	\N
81	demo2-sal-24:pay	CUSTOMER_RECEIPT	cmvy6fh0o000f22p7niknfs0y	4200.00	2026-09-30 00:00:00	\N	\N	24	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.908	\N	\N
82	demo2-sal-25:pay	CUSTOMER_RECEIPT	cmvy6fh0p000g22p7nipaqoei	3600.00	2026-10-02 00:00:00	\N	\N	25	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.911	\N	\N
83	demo2-sal-26:pay	CUSTOMER_RECEIPT	cmvy6fh0q000h22p73q9ycafb	9000.00	2026-10-04 00:00:00	\N	\N	26	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.917	\N	\N
84	demo2-sal-27:pay	CUSTOMER_RECEIPT	cmvy6fh0r000k22p7henjamrr	6000.00	2026-10-07 00:00:00	\N	\N	27	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.92	\N	\N
85	demo2-sal-28:pay	CUSTOMER_RECEIPT	cmvy6fh0q000i22p7r8hungmy	2750.00	2026-10-10 00:00:00	\N	\N	28	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.923	\N	\N
86	demo2-sal-29:pay	CUSTOMER_RECEIPT	cmvy6fh0r000j22p740dehlxc	2100.00	2026-10-12 00:00:00	\N	\N	29	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.927	\N	\N
87	demo2-sal-30:pay	CUSTOMER_RECEIPT	cmvy6fh0o000f22p7niknfs0y	2000.00	2026-10-20 00:00:00	\N	\N	30	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.93	\N	\N
88	demo2-sal-31:pay	CUSTOMER_RECEIPT	cmvy6fh0p000g22p7nipaqoei	1500.00	2026-10-22 00:00:00	\N	\N	31	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.934	\N	\N
89	demo2-sal-32:pay	CUSTOMER_RECEIPT	cmvy6fh0q000h22p73q9ycafb	3000.00	2026-10-24 00:00:00	\N	\N	32	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.938	\N	\N
90	demo2-sal-35:pay	CUSTOMER_RECEIPT	cmvy6fh0r000j22p740dehlxc	1500.00	2026-10-28 00:00:00	\N	\N	35	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.947	\N	\N
91	demo2-pay-v01	VENDOR_PAYMENT	cmvy6fh0m000c22p7udxmlhqv	2000.00	2026-07-14 00:00:00	Partial payment for flour	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.958	\N	\N
92	demo2-pay-v02	VENDOR_PAYMENT	cmvy6fh0n000d22p7ay04uc7m	1500.00	2026-07-29 00:00:00	Partial sugar payment	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.96	\N	\N
93	demo2-pay-v03	VENDOR_PAYMENT	cmvy6fh0o000e22p7h4o3w4kj	2500.00	2026-08-18 00:00:00	Butter balance	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.962	\N	\N
94	demo2-pay-c01	CUSTOMER_RECEIPT	cmvy6fh0o000f22p7niknfs0y	1000.00	2026-07-24 00:00:00	Advance from Sharma	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.964	\N	\N
95	demo2-pay-c02	CUSTOMER_RECEIPT	cmvy6fh0q000h22p73q9ycafb	2000.00	2026-08-13 00:00:00	Metro partial payment	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.966	\N	\N
96	demo2-pay-c03	CUSTOMER_RECEIPT	cmvy6fh0r000k22p7henjamrr	3000.00	2026-09-12 00:00:00	Sunrise advance	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.968	\N	\N
97	demo2-pay-c04	CUSTOMER_RECEIPT	cmvy6fh0q000i22p7r8hungmy	1500.00	2026-10-12 00:00:00	QuickMart balance	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.97	\N	\N
98	demo2-pay-e01	LABOUR	cmvy6fh0s000l22p7s13m1s5r	500.00	2026-07-04 00:00:00	Transport charges	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:24.557	\N	\N
99	demo2-pay-e02	LABOUR	cmvy6fh0t000m22p7jwhdeen5	800.00	2026-08-03 00:00:00	Repairs & maintenance	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:24.559	\N	\N
100	demo2-pay-e03	LABOUR	cmvy6fh0t000n22p74ftjbfjx	300.00	2026-09-02 00:00:00	Office supplies	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:24.562	\N	\N
101	demo2-pay-e04	LABOUR	cmvy6fh0s000l22p7s13m1s5r	600.00	2026-10-02 00:00:00	Cleaning & utilities	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:24.564	\N	\N
102	demo2-pay-e05	LABOUR	cmvy6fh0t000m22p7jwhdeen5	450.00	2026-10-22 00:00:00	Transport charges	\N	\N	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:24.566	\N	\N
103	demo2-sal-37:pay	CUSTOMER_RECEIPT	cmvy6fh0q000h22p73q9ycafb	800.00	2026-10-30 00:00:00	\N	\N	42	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:41.124	\N	\N
\.


--
-- Data for Name: ProductMaterial; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductMaterial" (id, "productId", "materialId") FROM stdin;
1	cmvy5zjpa0004asnvnnnduzfh	cmvy5zjp50002asnv6i4djglc
2	cmvy5zjpa0004asnvnnnduzfh	cmvy5zjp80003asnvl2a9heiq
3	cmvy6fgzu000822p7olxczett	cmvy5zjp50002asnv6i4djglc
4	cmvy6fgzu000822p7olxczett	cmvy5zjp80003asnvl2a9heiq
5	cmvy6fgzu000822p7olxczett	cmvy6fgzn000422p7jw8o35ou
6	cmvy6fgzu000822p7olxczett	cmvy6fgzs000722p73awvnkju
7	cmvy6fgzw000922p7svi8h8ei	cmvy5zjp50002asnv6i4djglc
8	cmvy6fgzw000922p7svi8h8ei	cmvy5zjp80003asnvl2a9heiq
9	cmvy6fgzw000922p7svi8h8ei	cmvy6fgzn000422p7jw8o35ou
10	cmvy6fgzw000922p7svi8h8ei	cmvy6fgzq000522p79jxyaxfv
11	cmvy6fgzw000922p7svi8h8ei	cmvy6fgzs000722p73awvnkju
12	cmvy6fgzx000a22p77rspb444	cmvy5zjp50002asnv6i4djglc
13	cmvy6fgzx000a22p77rspb444	cmvy6fgzr000622p75w9nngm6
14	cmvy6fgzx000a22p77rspb444	cmvy6fgzs000722p73awvnkju
15	cmvy6fgzz000b22p7r8mqn8kq	cmvy5zjp50002asnv6i4djglc
16	cmvy6fgzz000b22p7r8mqn8kq	cmvy5zjp80003asnvl2a9heiq
17	cmvy6fgzz000b22p7r8mqn8kq	cmvy6fgzn000422p7jw8o35ou
18	cmvy6fgzz000b22p7r8mqn8kq	cmvy6fgzq000522p79jxyaxfv
19	cmvy6fgzz000b22p7r8mqn8kq	cmvy6fgzr000622p75w9nngm6
20	cmvy6fgzz000b22p7r8mqn8kq	cmvy6fgzs000722p73awvnkju
\.


--
-- Data for Name: ProductionBatch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductionBatch" (id, "requestId", "productId", date, "qtyProduced", "qtyRejected", "materialCost", "labourCost", "otherCost", "costPerUnit", note, "createdById", "createdAt", "cancelledAt", "cancelReason") FROM stdin;
1	demo2-bat-01	cmvy6fgzu000822p7olxczett	2026-06-06 00:00:00	500.000	25.000	8294.99	5500.00	800.00	30.7263	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.731	\N	\N
2	demo2-bat-02	cmvy6fgzw000922p7svi8h8ei	2026-06-14 00:00:00	400.000	30.000	9338.03	4500.00	600.00	39.0217	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.741	\N	\N
3	demo2-bat-03	cmvy6fgzx000a22p77rspb444	2026-06-24 00:00:00	350.000	10.000	3882.17	3800.00	700.00	24.6534	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.751	\N	\N
4	demo2-bat-04	cmvy6fgzu000822p7olxczett	2026-07-24 00:00:00	600.000	20.000	9971.07	6500.00	1300.00	30.6398	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.758	\N	\N
5	demo2-bat-05	cmvy6fgzz000b22p7r8mqn8kq	2026-07-29 00:00:00	200.000	15.000	7415.56	4000.00	500.00	64.4084	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.767	\N	\N
6	demo2-bat-06	cmvy6fgzw000922p7svi8h8ei	2026-08-23 00:00:00	450.000	20.000	10989.27	5800.00	1550.00	42.6495	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.777	\N	\N
7	demo2-bat-07	cmvy6fgzu000822p7olxczett	2026-09-17 00:00:00	550.000	30.000	9209.23	5900.00	800.00	30.5947	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.785	\N	\N
8	demo2-bat-08	cmvy6fgzx000a22p77rspb444	2026-10-07 00:00:00	300.000	8.000	3386.88	3400.00	650.00	25.4688	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.793	\N	\N
9	demo2-bat-09	cmvy6fgzz000b22p7r8mqn8kq	2026-10-17 00:00:00	180.000	10.000	6122.57	3600.00	450.00	59.8386	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.8	\N	\N
10	demo2-bat-10	cmvy6fgzu000822p7olxczett	2026-10-27 00:00:00	400.000	15.000	7092.81	4700.00	750.00	32.5787	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.81	\N	\N
\.


--
-- Data for Name: Purchase; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Purchase" (id, "requestId", "vendorId", date, "refNo", total, note, "createdById", "createdAt", "cancelledAt", "cancelReason") FROM stdin;
1	f37f33d5-a576-4877-8fad-5439b1672e85	cmvy5zjpi0006asnvulx367rq	2026-11-02 00:00:00	\N	99401.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:32:41.805	\N	\N
2	demo2-pur-01	cmvy6fh0m000c22p7udxmlhqv	2026-05-30 00:00:00	\N	8400.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.127	\N	\N
3	demo2-pur-02	cmvy6fh0n000d22p7ay04uc7m	2026-06-02 00:00:00	\N	2600.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.134	\N	\N
4	demo2-pur-03	cmvy6fh0o000e22p7h4o3w4kj	2026-06-04 00:00:00	\N	3200.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.14	\N	\N
5	demo2-pur-04	cmvy6fh0m000c22p7udxmlhqv	2026-07-04 00:00:00	\N	12160.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.145	\N	\N
6	demo2-pur-05	cmvy6fh0n000d22p7ay04uc7m	2026-07-06 00:00:00	\N	3120.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.151	\N	\N
7	demo2-pur-06	cmvy6fh0o000e22p7h4o3w4kj	2026-07-09 00:00:00	\N	8170.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.156	\N	\N
8	demo2-pur-07	cmvy6fh0m000c22p7udxmlhqv	2026-07-14 00:00:00	\N	3000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.161	\N	\N
9	demo2-pur-08	cmvy6fh0m000c22p7udxmlhqv	2026-08-03 00:00:00	\N	13200.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.166	\N	\N
10	demo2-pur-09	cmvy6fh0n000d22p7ay04uc7m	2026-08-05 00:00:00	\N	4240.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.17	\N	\N
11	demo2-pur-10	cmvy6fh0o000e22p7h4o3w4kj	2026-08-08 00:00:00	\N	10700.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.174	\N	\N
12	demo2-pur-11	cmvy6fh0m000c22p7udxmlhqv	2026-08-11 00:00:00	\N	1840.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.18	\N	\N
13	demo2-pur-12	cmvy6fh0m000c22p7udxmlhqv	2026-08-13 00:00:00	\N	2100.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.184	\N	\N
14	demo2-pur-13	cmvy6fh0m000c22p7udxmlhqv	2026-08-31 00:00:00	\N	11000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.188	\N	\N
15	demo2-pur-14	cmvy6fh0n000d22p7ay04uc7m	2026-09-02 00:00:00	\N	3780.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.192	\N	\N
16	demo2-pur-15	cmvy6fh0o000e22p7h4o3w4kj	2026-09-04 00:00:00	\N	5525.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.671	\N	\N
17	demo2-pur-16	cmvy6fh0m000c22p7udxmlhqv	2026-09-07 00:00:00	\N	5600.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.679	\N	\N
18	demo2-pur-17	cmvy6fh0m000c22p7udxmlhqv	2026-09-27 00:00:00	\N	11700.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.686	\N	\N
19	demo2-pur-18	cmvy6fh0n000d22p7ay04uc7m	2026-09-29 00:00:00	\N	4320.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.691	\N	\N
20	demo2-pur-19	cmvy6fh0o000e22p7h4o3w4kj	2026-10-02 00:00:00	\N	11300.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.696	\N	\N
21	demo2-pur-20	cmvy6fh0m000c22p7udxmlhqv	2026-10-04 00:00:00	\N	2015.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.701	\N	\N
22	demo2-pur-21	cmvy6fh0m000c22p7udxmlhqv	2026-10-18 00:00:00	\N	6900.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.706	\N	\N
23	demo2-pur-22	cmvy6fh0n000d22p7ay04uc7m	2026-10-20 00:00:00	\N	2750.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.71	\N	\N
24	demo2-pur-23	cmvy6fh0o000e22p7h4o3w4kj	2026-10-22 00:00:00	\N	3480.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.715	\N	\N
25	demo2-pur-24	cmvy6fh0m000c22p7udxmlhqv	2026-10-25 00:00:00	\N	5230.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.719	\N	\N
26	demo2-pur-25	cmvy6fh0o000e22p7h4o3w4kj	2026-10-29 00:00:00	\N	2975.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.724	\N	\N
\.


--
-- Data for Name: PurchaseLine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PurchaseLine" (id, "purchaseId", "itemId", qty, rate, amount) FROM stdin;
1	1	cmvy5zjp80003asnvl2a9heiq	100.000	100.0000	10000.00
2	1	cmvy5zjp80003asnvl2a9heiq	299.000	299.0000	89401.00
3	2	cmvy5zjp50002asnv6i4djglc	200.000	42.0000	8400.00
4	3	cmvy5zjp80003asnvl2a9heiq	50.000	52.0000	2600.00
5	4	cmvy6fgzn000422p7jw8o35ou	40.000	80.0000	3200.00
6	5	cmvy5zjp50002asnv6i4djglc	220.000	43.0000	9460.00
7	5	cmvy6fgzr000622p75w9nngm6	30.000	90.0000	2700.00
8	6	cmvy5zjp80003asnvl2a9heiq	60.000	52.0000	3120.00
9	7	cmvy6fgzn000422p7jw8o35ou	60.000	82.0000	4920.00
10	7	cmvy6fgzq000522p79jxyaxfv	25.000	130.0000	3250.00
11	8	cmvy6fgzs000722p73awvnkju	20.000	150.0000	3000.00
12	9	cmvy5zjp50002asnv6i4djglc	300.000	44.0000	13200.00
13	10	cmvy5zjp80003asnvl2a9heiq	80.000	53.0000	4240.00
14	11	cmvy6fgzn000422p7jw8o35ou	80.000	85.0000	6800.00
15	11	cmvy6fgzq000522p79jxyaxfv	30.000	130.0000	3900.00
16	12	cmvy6fgzr000622p75w9nngm6	20.000	92.0000	1840.00
17	13	cmvy6fgzs000722p73awvnkju	14.000	150.0000	2100.00
18	14	cmvy5zjp50002asnv6i4djglc	250.000	44.0000	11000.00
19	15	cmvy5zjp80003asnvl2a9heiq	70.000	54.0000	3780.00
20	16	cmvy6fgzn000422p7jw8o35ou	65.000	85.0000	5525.00
21	17	cmvy6fgzq000522p79jxyaxfv	25.000	132.0000	3300.00
22	17	cmvy6fgzr000622p75w9nngm6	25.000	92.0000	2300.00
23	18	cmvy5zjp50002asnv6i4djglc	260.000	45.0000	11700.00
24	19	cmvy5zjp80003asnvl2a9heiq	80.000	54.0000	4320.00
25	20	cmvy6fgzn000422p7jw8o35ou	85.000	86.0000	7310.00
26	20	cmvy6fgzq000522p79jxyaxfv	30.000	133.0000	3990.00
27	21	cmvy6fgzs000722p73awvnkju	13.000	155.0000	2015.00
28	22	cmvy5zjp50002asnv6i4djglc	150.000	46.0000	6900.00
29	23	cmvy5zjp80003asnvl2a9heiq	50.000	55.0000	2750.00
30	24	cmvy6fgzn000422p7jw8o35ou	40.000	87.0000	3480.00
31	25	cmvy5zjp50002asnv6i4djglc	80.000	46.0000	3680.00
32	25	cmvy6fgzs000722p73awvnkju	10.000	155.0000	1550.00
33	26	cmvy6fgzq000522p79jxyaxfv	15.000	135.0000	2025.00
34	26	cmvy6fgzr000622p75w9nngm6	10.000	95.0000	950.00
\.


--
-- Data for Name: Sale; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sale" (id, "requestId", "customerId", date, total, note, "createdById", "createdAt", "cancelledAt", "cancelReason") FROM stdin;
1	demo2-sal-01	cmvy6fh0o000f22p7niknfs0y	2026-06-09 00:00:00	2400.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.818	\N	\N
2	demo2-sal-02	cmvy6fh0p000g22p7nipaqoei	2026-06-11 00:00:00	2000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.822	\N	\N
3	demo2-sal-03	cmvy6fh0q000h22p73q9ycafb	2026-06-16 00:00:00	4800.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.826	\N	\N
4	demo2-sal-04	cmvy6fh0q000i22p7r8hungmy	2026-06-19 00:00:00	1800.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.83	\N	\N
5	demo2-sal-05	cmvy6fh0r000j22p740dehlxc	2026-06-24 00:00:00	1600.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.834	\N	\N
6	demo2-sal-06	cmvy6fh0o000f22p7niknfs0y	2026-07-09 00:00:00	3000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.839	\N	\N
7	demo2-sal-07	cmvy6fh0p000g22p7nipaqoei	2026-07-12 00:00:00	2400.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.842	\N	\N
8	demo2-sal-08	cmvy6fh0q000h22p73q9ycafb	2026-07-14 00:00:00	6000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.846	\N	\N
9	demo2-sal-09	cmvy6fh0r000k22p7henjamrr	2026-07-16 00:00:00	3600.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.851	\N	\N
10	demo2-sal-10	cmvy6fh0q000i22p7r8hungmy	2026-07-19 00:00:00	2000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.854	\N	\N
11	demo2-sal-11	cmvy6fh0r000j22p740dehlxc	2026-07-22 00:00:00	1800.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.858	\N	\N
12	demo2-sal-12	cmvy6fh0o000f22p7niknfs0y	2026-08-05 00:00:00	4500.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.861	\N	\N
13	demo2-sal-13	cmvy6fh0p000g22p7nipaqoei	2026-08-07 00:00:00	4000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.865	\N	\N
14	demo2-sal-14	cmvy6fh0q000h22p73q9ycafb	2026-08-10 00:00:00	8000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.869	\N	\N
15	demo2-sal-15	cmvy6fh0r000k22p7henjamrr	2026-08-13 00:00:00	6000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.874	\N	\N
16	demo2-sal-16	cmvy6fh0q000i22p7r8hungmy	2026-08-15 00:00:00	3000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.878	\N	\N
17	demo2-sal-17	cmvy6fh0r000j22p740dehlxc	2026-08-18 00:00:00	2400.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.881	\N	\N
18	demo2-sal-18	cmvy6fh0o000f22p7niknfs0y	2026-09-02 00:00:00	3600.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.884	\N	\N
19	demo2-sal-19	cmvy6fh0p000g22p7nipaqoei	2026-09-04 00:00:00	3200.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.888	\N	\N
20	demo2-sal-20	cmvy6fh0q000h22p73q9ycafb	2026-09-06 00:00:00	7600.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.891	\N	\N
21	demo2-sal-21	cmvy6fh0r000k22p7henjamrr	2026-09-09 00:00:00	4800.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.896	\N	\N
22	demo2-sal-22	cmvy6fh0q000i22p7r8hungmy	2026-09-12 00:00:00	2500.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.899	\N	\N
23	demo2-sal-23	cmvy6fh0r000j22p740dehlxc	2026-09-14 00:00:00	1200.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.903	\N	\N
24	demo2-sal-24	cmvy6fh0o000f22p7niknfs0y	2026-09-30 00:00:00	4200.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.907	\N	\N
25	demo2-sal-25	cmvy6fh0p000g22p7nipaqoei	2026-10-02 00:00:00	3600.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.91	\N	\N
26	demo2-sal-26	cmvy6fh0q000h22p73q9ycafb	2026-10-04 00:00:00	9000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.914	\N	\N
27	demo2-sal-27	cmvy6fh0r000k22p7henjamrr	2026-10-07 00:00:00	6000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.919	\N	\N
28	demo2-sal-28	cmvy6fh0q000i22p7r8hungmy	2026-10-10 00:00:00	2750.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.922	\N	\N
29	demo2-sal-29	cmvy6fh0r000j22p740dehlxc	2026-10-12 00:00:00	2100.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.926	\N	\N
30	demo2-sal-30	cmvy6fh0o000f22p7niknfs0y	2026-10-20 00:00:00	3000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.929	\N	\N
31	demo2-sal-31	cmvy6fh0p000g22p7nipaqoei	2026-10-22 00:00:00	2400.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.933	\N	\N
32	demo2-sal-32	cmvy6fh0q000h22p73q9ycafb	2026-10-24 00:00:00	3600.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.936	\N	\N
33	demo2-sal-33	cmvy6fh0r000k22p7henjamrr	2026-10-26 00:00:00	3600.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.941	\N	\N
35	demo2-sal-35	cmvy6fh0r000j22p740dehlxc	2026-10-28 00:00:00	1500.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.946	\N	\N
39	demo2-sal-34	cmvy6fh0q000i22p7r8hungmy	2026-10-27 00:00:00	1000.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:24.535	\N	\N
40	demo2-sal-36	cmvy6fh0o000f22p7niknfs0y	2026-10-29 00:00:00	600.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:24.542	\N	\N
42	demo2-sal-37	cmvy6fh0q000h22p73q9ycafb	2026-10-30 00:00:00	800.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:41.121	\N	\N
43	demo2-sal-38	cmvy6fh0p000g22p7nipaqoei	2026-10-31 00:00:00	125.00	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:41.127	\N	\N
\.


--
-- Data for Name: SaleLine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SaleLine" (id, "saleId", "itemId", qty, rate, amount, "costAtSale") FROM stdin;
1	1	cmvy6fgzu000822p7olxczett	80.000	30.0000	2400.00	31.0297
2	2	cmvy6fgzx000a22p77rspb444	80.000	25.0000	2000.00	25.0301
3	3	cmvy6fgzu000822p7olxczett	80.000	30.0000	2400.00	31.0297
4	3	cmvy6fgzw000922p7svi8h8ei	60.000	40.0000	2400.00	40.9716
5	4	cmvy6fgzz000b22p7r8mqn8kq	15.000	120.0000	1800.00	62.2200
6	5	cmvy6fgzu000822p7olxczett	40.000	30.0000	1200.00	31.0297
7	5	cmvy6fgzx000a22p77rspb444	16.000	25.0000	400.00	25.0301
8	6	cmvy6fgzu000822p7olxczett	100.000	30.0000	3000.00	31.0297
9	7	cmvy6fgzw000922p7svi8h8ei	60.000	40.0000	2400.00	40.9716
10	8	cmvy6fgzu000822p7olxczett	100.000	30.0000	3000.00	31.0297
11	8	cmvy6fgzw000922p7svi8h8ei	75.000	40.0000	3000.00	40.9716
12	9	cmvy6fgzz000b22p7r8mqn8kq	30.000	120.0000	3600.00	62.2200
13	10	cmvy6fgzx000a22p77rspb444	80.000	25.0000	2000.00	25.0301
14	11	cmvy6fgzu000822p7olxczett	60.000	30.0000	1800.00	31.0297
15	12	cmvy6fgzu000822p7olxczett	150.000	30.0000	4500.00	31.0297
16	13	cmvy6fgzw000922p7svi8h8ei	100.000	40.0000	4000.00	40.9716
17	14	cmvy6fgzu000822p7olxczett	100.000	30.0000	3000.00	31.0297
18	14	cmvy6fgzw000922p7svi8h8ei	75.000	40.0000	3000.00	40.9716
19	14	cmvy6fgzx000a22p77rspb444	80.000	25.0000	2000.00	25.0301
20	15	cmvy6fgzz000b22p7r8mqn8kq	50.000	120.0000	6000.00	62.2200
21	16	cmvy6fgzx000a22p77rspb444	120.000	25.0000	3000.00	25.0301
22	17	cmvy6fgzu000822p7olxczett	80.000	30.0000	2400.00	31.0297
23	18	cmvy6fgzu000822p7olxczett	120.000	30.0000	3600.00	31.0297
24	19	cmvy6fgzw000922p7svi8h8ei	80.000	40.0000	3200.00	40.9716
25	20	cmvy6fgzw000922p7svi8h8ei	100.000	40.0000	4000.00	40.9716
26	20	cmvy6fgzz000b22p7r8mqn8kq	30.000	120.0000	3600.00	62.2200
27	21	cmvy6fgzz000b22p7r8mqn8kq	40.000	120.0000	4800.00	62.2200
28	22	cmvy6fgzx000a22p77rspb444	100.000	25.0000	2500.00	25.0301
29	23	cmvy6fgzu000822p7olxczett	40.000	30.0000	1200.00	31.0297
30	24	cmvy6fgzu000822p7olxczett	140.000	30.0000	4200.00	31.0297
31	25	cmvy6fgzw000922p7svi8h8ei	90.000	40.0000	3600.00	40.9716
32	26	cmvy6fgzu000822p7olxczett	100.000	30.0000	3000.00	31.0297
33	26	cmvy6fgzw000922p7svi8h8ei	75.000	40.0000	3000.00	40.9716
34	26	cmvy6fgzz000b22p7r8mqn8kq	25.000	120.0000	3000.00	62.2200
35	27	cmvy6fgzz000b22p7r8mqn8kq	50.000	120.0000	6000.00	62.2200
36	28	cmvy6fgzx000a22p77rspb444	110.000	25.0000	2750.00	25.0301
37	29	cmvy6fgzu000822p7olxczett	70.000	30.0000	2100.00	31.0297
38	30	cmvy6fgzu000822p7olxczett	100.000	30.0000	3000.00	31.0297
39	31	cmvy6fgzw000922p7svi8h8ei	60.000	40.0000	2400.00	40.9716
40	32	cmvy6fgzu000822p7olxczett	60.000	30.0000	1800.00	31.0297
41	32	cmvy6fgzz000b22p7r8mqn8kq	15.000	120.0000	1800.00	62.2200
42	33	cmvy6fgzz000b22p7r8mqn8kq	30.000	120.0000	3600.00	62.2200
43	35	cmvy6fgzu000822p7olxczett	50.000	30.0000	1500.00	31.0297
45	39	cmvy6fgzx000a22p77rspb444	40.000	25.0000	1000.00	25.0301
46	40	cmvy6fgzu000822p7olxczett	20.000	30.0000	600.00	31.0297
47	42	cmvy6fgzw000922p7svi8h8ei	20.000	40.0000	800.00	40.9716
48	43	cmvy6fgzx000a22p77rspb444	5.000	25.0000	125.00	25.0301
\.


--
-- Data for Name: StockMovement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockMovement" (id, "itemId", reason, "qtyChange", "qtyBefore", "qtyAfter", "unitCost", "refType", "refId", note, "createdById", "createdAt") FROM stdin;
1	cmvy5zjp80003asnvl2a9heiq	PURCHASE	100.000	0.000	100.000	100.0000	Purchase	1	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:32:41.813
2	cmvy5zjp80003asnvl2a9heiq	PURCHASE	299.000	100.000	399.000	299.0000	Purchase	1	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:32:41.816
3	cmvy5zjp50002asnv6i4djglc	PURCHASE	200.000	0.000	200.000	42.0000	Purchase	2	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.13
4	cmvy5zjp80003asnvl2a9heiq	PURCHASE	50.000	399.000	449.000	52.0000	Purchase	3	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.136
5	cmvy6fgzn000422p7jw8o35ou	PURCHASE	40.000	0.000	40.000	80.0000	Purchase	4	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.141
6	cmvy5zjp50002asnv6i4djglc	PURCHASE	220.000	200.000	420.000	43.0000	Purchase	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.146
7	cmvy6fgzr000622p75w9nngm6	PURCHASE	30.000	0.000	30.000	90.0000	Purchase	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.147
8	cmvy5zjp80003asnvl2a9heiq	PURCHASE	60.000	449.000	509.000	52.0000	Purchase	6	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.152
9	cmvy6fgzn000422p7jw8o35ou	PURCHASE	60.000	40.000	100.000	82.0000	Purchase	7	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.157
10	cmvy6fgzq000522p79jxyaxfv	PURCHASE	25.000	0.000	25.000	130.0000	Purchase	7	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.158
11	cmvy6fgzs000722p73awvnkju	PURCHASE	20.000	0.000	20.000	150.0000	Purchase	8	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.163
12	cmvy5zjp50002asnv6i4djglc	PURCHASE	300.000	420.000	720.000	44.0000	Purchase	9	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.167
13	cmvy5zjp80003asnvl2a9heiq	PURCHASE	80.000	509.000	589.000	53.0000	Purchase	10	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.171
14	cmvy6fgzn000422p7jw8o35ou	PURCHASE	80.000	100.000	180.000	85.0000	Purchase	11	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.176
15	cmvy6fgzq000522p79jxyaxfv	PURCHASE	30.000	25.000	55.000	130.0000	Purchase	11	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.177
16	cmvy6fgzr000622p75w9nngm6	PURCHASE	20.000	30.000	50.000	92.0000	Purchase	12	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.181
17	cmvy6fgzs000722p73awvnkju	PURCHASE	14.000	20.000	34.000	150.0000	Purchase	13	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.185
18	cmvy5zjp50002asnv6i4djglc	PURCHASE	250.000	720.000	970.000	44.0000	Purchase	14	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.189
19	cmvy5zjp80003asnvl2a9heiq	PURCHASE	70.000	589.000	659.000	54.0000	Purchase	15	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:41:52.193
20	cmvy6fgzn000422p7jw8o35ou	PURCHASE	65.000	180.000	245.000	85.0000	Purchase	16	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.674
21	cmvy6fgzq000522p79jxyaxfv	PURCHASE	25.000	55.000	80.000	132.0000	Purchase	17	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.681
22	cmvy6fgzr000622p75w9nngm6	PURCHASE	25.000	50.000	75.000	92.0000	Purchase	17	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.682
23	cmvy5zjp50002asnv6i4djglc	PURCHASE	260.000	970.000	1230.000	45.0000	Purchase	18	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.687
24	cmvy5zjp80003asnvl2a9heiq	PURCHASE	80.000	659.000	739.000	54.0000	Purchase	19	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.692
25	cmvy6fgzn000422p7jw8o35ou	PURCHASE	85.000	245.000	330.000	86.0000	Purchase	20	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.697
26	cmvy6fgzq000522p79jxyaxfv	PURCHASE	30.000	80.000	110.000	133.0000	Purchase	20	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.698
27	cmvy6fgzs000722p73awvnkju	PURCHASE	13.000	34.000	47.000	155.0000	Purchase	21	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.703
28	cmvy5zjp50002asnv6i4djglc	PURCHASE	150.000	1230.000	1380.000	46.0000	Purchase	22	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.707
29	cmvy5zjp80003asnvl2a9heiq	PURCHASE	50.000	739.000	789.000	55.0000	Purchase	23	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.712
30	cmvy6fgzn000422p7jw8o35ou	PURCHASE	40.000	330.000	370.000	87.0000	Purchase	24	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.716
31	cmvy5zjp50002asnv6i4djglc	PURCHASE	80.000	1380.000	1460.000	46.0000	Purchase	25	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.721
32	cmvy6fgzs000722p73awvnkju	PURCHASE	10.000	47.000	57.000	155.0000	Purchase	25	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.722
33	cmvy6fgzq000522p79jxyaxfv	PURCHASE	15.000	110.000	125.000	135.0000	Purchase	26	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.726
34	cmvy6fgzr000622p75w9nngm6	PURCHASE	10.000	75.000	85.000	95.0000	Purchase	26	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.727
35	cmvy5zjp50002asnv6i4djglc	PRODUCTION_USE	-80.000	1460.000	1380.000	44.0685	Batch	1	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.733
36	cmvy5zjp80003asnvl2a9heiq	PRODUCTION_USE	-20.000	789.000	769.000	152.3587	Batch	1	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.734
37	cmvy6fgzn000422p7jw8o35ou	PRODUCTION_USE	-15.000	370.000	355.000	84.4190	Batch	1	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.734
38	cmvy6fgzs000722p73awvnkju	PRODUCTION_USE	-3.000	57.000	54.000	152.0176	Batch	1	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.735
39	cmvy6fgzu000822p7olxczett	PRODUCTION_OUTPUT	475.000	0.000	475.000	30.7263	Batch	1	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.737
40	cmvy5zjp50002asnv6i4djglc	PRODUCTION_USE	-60.000	1380.000	1320.000	44.0685	Batch	2	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.742
41	cmvy5zjp80003asnvl2a9heiq	PRODUCTION_USE	-18.000	769.000	751.000	152.3587	Batch	2	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.743
42	cmvy6fgzn000422p7jw8o35ou	PRODUCTION_USE	-12.000	355.000	343.000	84.4190	Batch	2	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.744
43	cmvy6fgzq000522p79jxyaxfv	PRODUCTION_USE	-20.000	125.000	105.000	131.7200	Batch	2	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.744
44	cmvy6fgzs000722p73awvnkju	PRODUCTION_USE	-2.000	54.000	52.000	152.0176	Batch	2	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.745
45	cmvy6fgzw000922p7svi8h8ei	PRODUCTION_OUTPUT	370.000	0.000	370.000	39.0217	Batch	2	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.747
46	cmvy5zjp50002asnv6i4djglc	PRODUCTION_USE	-50.000	1320.000	1270.000	44.0685	Batch	3	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.752
47	cmvy6fgzr000622p75w9nngm6	PRODUCTION_USE	-15.000	85.000	70.000	91.6471	Batch	3	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.752
48	cmvy6fgzs000722p73awvnkju	PRODUCTION_USE	-2.000	52.000	50.000	152.0176	Batch	3	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.753
49	cmvy6fgzx000a22p77rspb444	PRODUCTION_OUTPUT	340.000	0.000	340.000	24.6534	Batch	3	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.755
50	cmvy5zjp50002asnv6i4djglc	PRODUCTION_USE	-95.000	1270.000	1175.000	44.0685	Batch	4	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.759
51	cmvy5zjp80003asnvl2a9heiq	PRODUCTION_USE	-25.000	751.000	726.000	152.3587	Batch	4	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.76
52	cmvy6fgzn000422p7jw8o35ou	PRODUCTION_USE	-18.000	343.000	325.000	84.4190	Batch	4	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.76
53	cmvy6fgzs000722p73awvnkju	PRODUCTION_USE	-3.000	50.000	47.000	152.0176	Batch	4	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.761
54	cmvy6fgzu000822p7olxczett	PRODUCTION_OUTPUT	580.000	475.000	1055.000	30.6398	Batch	4	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.763
55	cmvy5zjp50002asnv6i4djglc	PRODUCTION_USE	-40.000	1175.000	1135.000	44.0685	Batch	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.768
56	cmvy5zjp80003asnvl2a9heiq	PRODUCTION_USE	-15.000	726.000	711.000	152.3587	Batch	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.768
57	cmvy6fgzn000422p7jw8o35ou	PRODUCTION_USE	-12.000	325.000	313.000	84.4190	Batch	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.769
58	cmvy6fgzq000522p79jxyaxfv	PRODUCTION_USE	-10.000	105.000	95.000	131.7200	Batch	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.77
59	cmvy6fgzr000622p75w9nngm6	PRODUCTION_USE	-8.000	70.000	62.000	91.6471	Batch	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.771
60	cmvy6fgzs000722p73awvnkju	PRODUCTION_USE	-2.000	47.000	45.000	152.0176	Batch	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.771
61	cmvy6fgzz000b22p7r8mqn8kq	PRODUCTION_OUTPUT	185.000	0.000	185.000	64.4084	Batch	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.773
62	cmvy5zjp50002asnv6i4djglc	PRODUCTION_USE	-70.000	1135.000	1065.000	44.0685	Batch	6	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.777
63	cmvy5zjp80003asnvl2a9heiq	PRODUCTION_USE	-22.000	711.000	689.000	152.3587	Batch	6	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.778
64	cmvy6fgzn000422p7jw8o35ou	PRODUCTION_USE	-16.000	313.000	297.000	84.4190	Batch	6	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.779
65	cmvy6fgzq000522p79jxyaxfv	PRODUCTION_USE	-22.000	95.000	73.000	131.7200	Batch	6	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.779
66	cmvy6fgzs000722p73awvnkju	PRODUCTION_USE	-2.000	45.000	43.000	152.0176	Batch	6	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.78
67	cmvy6fgzw000922p7svi8h8ei	PRODUCTION_OUTPUT	430.000	370.000	800.000	42.6495	Batch	6	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.782
68	cmvy5zjp50002asnv6i4djglc	PRODUCTION_USE	-90.000	1065.000	975.000	44.0685	Batch	7	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.786
69	cmvy5zjp80003asnvl2a9heiq	PRODUCTION_USE	-22.000	689.000	667.000	152.3587	Batch	7	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.787
70	cmvy6fgzn000422p7jw8o35ou	PRODUCTION_USE	-17.000	297.000	280.000	84.4190	Batch	7	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.787
71	cmvy6fgzs000722p73awvnkju	PRODUCTION_USE	-3.000	43.000	40.000	152.0176	Batch	7	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.788
72	cmvy6fgzu000822p7olxczett	PRODUCTION_OUTPUT	520.000	1055.000	1575.000	30.5947	Batch	7	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.789
73	cmvy5zjp50002asnv6i4djglc	PRODUCTION_USE	-45.000	975.000	930.000	44.0685	Batch	8	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.794
74	cmvy6fgzr000622p75w9nngm6	PRODUCTION_USE	-12.000	62.000	50.000	91.6471	Batch	8	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.794
75	cmvy6fgzs000722p73awvnkju	PRODUCTION_USE	-2.000	40.000	38.000	152.0176	Batch	8	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.795
76	cmvy6fgzx000a22p77rspb444	PRODUCTION_OUTPUT	292.000	340.000	632.000	25.4688	Batch	8	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.797
77	cmvy5zjp50002asnv6i4djglc	PRODUCTION_USE	-35.000	930.000	895.000	44.0685	Batch	9	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.801
78	cmvy5zjp80003asnvl2a9heiq	PRODUCTION_USE	-12.000	667.000	655.000	152.3587	Batch	9	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.802
79	cmvy6fgzn000422p7jw8o35ou	PRODUCTION_USE	-10.000	280.000	270.000	84.4190	Batch	9	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.802
80	cmvy6fgzq000522p79jxyaxfv	PRODUCTION_USE	-8.000	73.000	65.000	131.7200	Batch	9	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.803
81	cmvy6fgzr000622p75w9nngm6	PRODUCTION_USE	-6.000	50.000	44.000	91.6471	Batch	9	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.804
82	cmvy6fgzs000722p73awvnkju	PRODUCTION_USE	-2.000	38.000	36.000	152.0176	Batch	9	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.804
83	cmvy6fgzz000b22p7r8mqn8kq	PRODUCTION_OUTPUT	170.000	185.000	355.000	59.8386	Batch	9	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.806
84	cmvy5zjp50002asnv6i4djglc	PRODUCTION_USE	-65.000	895.000	830.000	44.0685	Batch	10	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.811
85	cmvy5zjp80003asnvl2a9heiq	PRODUCTION_USE	-18.000	655.000	637.000	152.3587	Batch	10	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.811
86	cmvy6fgzn000422p7jw8o35ou	PRODUCTION_USE	-14.000	270.000	256.000	84.4190	Batch	10	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.812
87	cmvy6fgzs000722p73awvnkju	PRODUCTION_USE	-2.000	36.000	34.000	152.0176	Batch	10	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.813
88	cmvy6fgzu000822p7olxczett	PRODUCTION_OUTPUT	385.000	1575.000	1960.000	32.5787	Batch	10	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.814
89	cmvy6fgzu000822p7olxczett	SALE	-80.000	1960.000	1880.000	31.0297	Sale	1	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.819
90	cmvy6fgzx000a22p77rspb444	SALE	-80.000	632.000	552.000	25.0301	Sale	2	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.823
91	cmvy6fgzu000822p7olxczett	SALE	-80.000	1880.000	1800.000	31.0297	Sale	3	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.827
92	cmvy6fgzw000922p7svi8h8ei	SALE	-60.000	800.000	740.000	40.9716	Sale	3	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.828
93	cmvy6fgzz000b22p7r8mqn8kq	SALE	-15.000	355.000	340.000	62.2200	Sale	4	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.831
94	cmvy6fgzu000822p7olxczett	SALE	-40.000	1800.000	1760.000	31.0297	Sale	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.835
95	cmvy6fgzx000a22p77rspb444	SALE	-16.000	552.000	536.000	25.0301	Sale	5	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.836
96	cmvy6fgzu000822p7olxczett	SALE	-100.000	1760.000	1660.000	31.0297	Sale	6	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.839
97	cmvy6fgzw000922p7svi8h8ei	SALE	-60.000	740.000	680.000	40.9716	Sale	7	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.843
98	cmvy6fgzu000822p7olxczett	SALE	-100.000	1660.000	1560.000	31.0297	Sale	8	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.847
99	cmvy6fgzw000922p7svi8h8ei	SALE	-75.000	680.000	605.000	40.9716	Sale	8	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.848
100	cmvy6fgzz000b22p7r8mqn8kq	SALE	-30.000	340.000	310.000	62.2200	Sale	9	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.851
101	cmvy6fgzx000a22p77rspb444	SALE	-80.000	536.000	456.000	25.0301	Sale	10	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.855
102	cmvy6fgzu000822p7olxczett	SALE	-60.000	1560.000	1500.000	31.0297	Sale	11	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.858
103	cmvy6fgzu000822p7olxczett	SALE	-150.000	1500.000	1350.000	31.0297	Sale	12	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.862
104	cmvy6fgzw000922p7svi8h8ei	SALE	-100.000	605.000	505.000	40.9716	Sale	13	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.865
105	cmvy6fgzu000822p7olxczett	SALE	-100.000	1350.000	1250.000	31.0297	Sale	14	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.869
106	cmvy6fgzw000922p7svi8h8ei	SALE	-75.000	505.000	430.000	40.9716	Sale	14	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.87
107	cmvy6fgzx000a22p77rspb444	SALE	-80.000	456.000	376.000	25.0301	Sale	14	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.871
108	cmvy6fgzz000b22p7r8mqn8kq	SALE	-50.000	310.000	260.000	62.2200	Sale	15	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.875
109	cmvy6fgzx000a22p77rspb444	SALE	-120.000	376.000	256.000	25.0301	Sale	16	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.878
110	cmvy6fgzu000822p7olxczett	SALE	-80.000	1250.000	1170.000	31.0297	Sale	17	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.882
111	cmvy6fgzu000822p7olxczett	SALE	-120.000	1170.000	1050.000	31.0297	Sale	18	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.885
112	cmvy6fgzw000922p7svi8h8ei	SALE	-80.000	430.000	350.000	40.9716	Sale	19	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.888
113	cmvy6fgzw000922p7svi8h8ei	SALE	-100.000	350.000	250.000	40.9716	Sale	20	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.892
114	cmvy6fgzz000b22p7r8mqn8kq	SALE	-30.000	260.000	230.000	62.2200	Sale	20	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.893
115	cmvy6fgzz000b22p7r8mqn8kq	SALE	-40.000	230.000	190.000	62.2200	Sale	21	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.896
116	cmvy6fgzx000a22p77rspb444	SALE	-100.000	256.000	156.000	25.0301	Sale	22	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.9
117	cmvy6fgzu000822p7olxczett	SALE	-40.000	1050.000	1010.000	31.0297	Sale	23	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.904
118	cmvy6fgzu000822p7olxczett	SALE	-140.000	1010.000	870.000	31.0297	Sale	24	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.907
119	cmvy6fgzw000922p7svi8h8ei	SALE	-90.000	250.000	160.000	40.9716	Sale	25	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.911
120	cmvy6fgzu000822p7olxczett	SALE	-100.000	870.000	770.000	31.0297	Sale	26	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.914
121	cmvy6fgzw000922p7svi8h8ei	SALE	-75.000	160.000	85.000	40.9716	Sale	26	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.915
122	cmvy6fgzz000b22p7r8mqn8kq	SALE	-25.000	190.000	165.000	62.2200	Sale	26	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.916
123	cmvy6fgzz000b22p7r8mqn8kq	SALE	-50.000	165.000	115.000	62.2200	Sale	27	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.92
124	cmvy6fgzx000a22p77rspb444	SALE	-110.000	156.000	46.000	25.0301	Sale	28	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.923
125	cmvy6fgzu000822p7olxczett	SALE	-70.000	770.000	700.000	31.0297	Sale	29	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.926
126	cmvy6fgzu000822p7olxczett	SALE	-100.000	700.000	600.000	31.0297	Sale	30	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.93
127	cmvy6fgzw000922p7svi8h8ei	SALE	-60.000	85.000	25.000	40.9716	Sale	31	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.933
128	cmvy6fgzu000822p7olxczett	SALE	-60.000	600.000	540.000	31.0297	Sale	32	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.937
129	cmvy6fgzz000b22p7r8mqn8kq	SALE	-15.000	115.000	100.000	62.2200	Sale	32	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.938
130	cmvy6fgzz000b22p7r8mqn8kq	SALE	-30.000	100.000	70.000	62.2200	Sale	33	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.941
131	cmvy6fgzu000822p7olxczett	SALE	-50.000	540.000	490.000	31.0297	Sale	35	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:42:41.947
133	cmvy6fgzx000a22p77rspb444	SALE	-40.000	46.000	6.000	25.0301	Sale	39	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:24.537
134	cmvy6fgzu000822p7olxczett	SALE	-20.000	490.000	470.000	31.0297	Sale	40	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:24.543
135	cmvy6fgzw000922p7svi8h8ei	SALE	-20.000	25.000	5.000	40.9716	Sale	42	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:41.123
136	cmvy6fgzx000a22p77rspb444	SALE	-5.000	6.000	1.000	25.0301	Sale	43	\N	cmvy5zjnc0000asnv2ds78f9s	2026-11-01 18:43:41.128
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, name, email, "passwordHash", role, active, "createdAt") FROM stdin;
cmvy5zjnc0000asnv2ds78f9s	Admin	admin@stockpilot.local	$2a$10$UE7rwWpI5aQlk1ufCQP2juaUMJ2IfW2.f.LRmIggscI9Xv.aaADR2	ADMIN	t	2026-11-01 18:29:29.017
cmvy5zjox0001asnvmxpalx9n	Suresh (worker)	worker@stockpilot.local	$2a$10$B32NQ1/1u81J.eIFlhAdL.zy6GB7dRdsnyr2KWMJGzPCC3IYH/iVO	WORKER	t	2026-11-01 18:29:29.074
\.


--
-- Name: AuditLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AuditLog_id_seq"', 4, true);


--
-- Name: Payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Payment_id_seq"', 103, true);


--
-- Name: ProductMaterial_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ProductMaterial_id_seq"', 20, true);


--
-- Name: ProductionBatch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ProductionBatch_id_seq"', 10, true);


--
-- Name: PurchaseLine_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PurchaseLine_id_seq"', 34, true);


--
-- Name: Purchase_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Purchase_id_seq"', 26, true);


--
-- Name: SaleLine_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."SaleLine_id_seq"', 48, true);


--
-- Name: Sale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Sale_id_seq"', 43, true);


--
-- Name: StockMovement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."StockMovement_id_seq"', 136, true);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Item Item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Item"
    ADD CONSTRAINT "Item_pkey" PRIMARY KEY (id);


--
-- Name: Party Party_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Party"
    ADD CONSTRAINT "Party_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: ProductMaterial ProductMaterial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductMaterial"
    ADD CONSTRAINT "ProductMaterial_pkey" PRIMARY KEY (id);


--
-- Name: ProductionBatch ProductionBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionBatch"
    ADD CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseLine PurchaseLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseLine"
    ADD CONSTRAINT "PurchaseLine_pkey" PRIMARY KEY (id);


--
-- Name: Purchase Purchase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_pkey" PRIMARY KEY (id);


--
-- Name: SaleLine SaleLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SaleLine"
    ADD CONSTRAINT "SaleLine_pkey" PRIMARY KEY (id);


--
-- Name: Sale Sale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_pkey" PRIMARY KEY (id);


--
-- Name: StockMovement StockMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: Item_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Item_name_key" ON public."Item" USING btree (name);


--
-- Name: Payment_date_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_date_kind_idx" ON public."Payment" USING btree (date, kind);


--
-- Name: Payment_requestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Payment_requestId_key" ON public."Payment" USING btree ("requestId");


--
-- Name: ProductMaterial_productId_materialId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductMaterial_productId_materialId_key" ON public."ProductMaterial" USING btree ("productId", "materialId");


--
-- Name: ProductionBatch_requestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductionBatch_requestId_key" ON public."ProductionBatch" USING btree ("requestId");


--
-- Name: Purchase_requestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Purchase_requestId_key" ON public."Purchase" USING btree ("requestId");


--
-- Name: Purchase_vendorId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Purchase_vendorId_date_idx" ON public."Purchase" USING btree ("vendorId", date);


--
-- Name: Sale_customerId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Sale_customerId_date_idx" ON public."Sale" USING btree ("customerId", date);


--
-- Name: Sale_requestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Sale_requestId_key" ON public."Sale" USING btree ("requestId");


--
-- Name: StockMovement_itemId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockMovement_itemId_createdAt_idx" ON public."StockMovement" USING btree ("itemId", "createdAt");


--
-- Name: StockMovement_refType_refId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockMovement_refType_refId_idx" ON public."StockMovement" USING btree ("refType", "refId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Payment Payment_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."ProductionBatch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_partyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES public."Party"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_purchaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES public."Purchase"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductMaterial ProductMaterial_materialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductMaterial"
    ADD CONSTRAINT "ProductMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES public."Item"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductMaterial ProductMaterial_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductMaterial"
    ADD CONSTRAINT "ProductMaterial_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Item"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductionBatch ProductionBatch_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionBatch"
    ADD CONSTRAINT "ProductionBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Item"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseLine PurchaseLine_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseLine"
    ADD CONSTRAINT "PurchaseLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."Item"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseLine PurchaseLine_purchaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseLine"
    ADD CONSTRAINT "PurchaseLine_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES public."Purchase"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Purchase Purchase_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Party"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleLine SaleLine_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SaleLine"
    ADD CONSTRAINT "SaleLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."Item"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleLine SaleLine_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SaleLine"
    ADD CONSTRAINT "SaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Sale Sale_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Party"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockMovement StockMovement_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."Item"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict FoXhTa0RfhaxzrAFdKGRrJUDJiZ439mg3BI09rvcBPacnJt01Q8BEkKaOVes8B9

