import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import Lenis from 'lenis'
import { categories, money, products, whatsappUrl, type Product } from './data/catalog'
import { useRemoteProducts } from './data/remoteCatalog'
import { useRemoteCategories } from './data/remoteCategories'
import { useRemoteContent } from './data/remoteContent'
import Admin from './Admin'

const categoryPath = (slug: string) => `/categorias/${slug}`

function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.65,
      easing: (time) => 1 - Math.pow(2, -7 * time),
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.85,
    })
    let frameId = 0
    const animate = (time: number) => {
      lenis.raf(time)
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frameId)
      lenis.destroy()
    }
  }, [])

  return null
}

function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    const reset = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    reset()
    const frame = requestAnimationFrame(reset)
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, location.key])

  return null
}

function Header() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const location = useLocation()
  const menuCategories = useRemoteCategories()
  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    let lastScroll = window.scrollY
    const onScroll = () => {
      const current = window.scrollY
      if (current <= 24 || current < lastScroll - 4) setHidden(false)
      else if (current > lastScroll + 4 && current > 90) { setHidden(true); setOpen(false) }
      lastScroll = current
    }
    const onPointerMove = (event: PointerEvent) => { if (event.clientY <= 90) setHidden(false) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('pointermove', onPointerMove) }
  }, [])
  return <header className={`site-header${hidden ? ' is-hidden' : ''}`}>
    <button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="main-nav"><span /><span /></button>
    <Link className="brand" to="/" aria-label="Due Sorelas, inicio">DUE <em>Sorelas</em></Link>
    <a className="header-contact" href={whatsappUrl('una pieza')} target="_blank" rel="noreferrer">Consultar <span>↗</span></a>
    <nav id="main-nav" className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Categorías">
      <Link to="/">Inicio</Link>
      {menuCategories.map((category) => <NavLink key={category.slug} to={categoryPath(category.slug)}>{category.name}</NavLink>)}
      <NavLink className="admin-nav-link" to="/admin">Ingresar</NavLink>
    </nav>
  </header>
}

function ProductCard({ product }: { product: Product }) {
  const secondaryImage = product.gallery[1]

  return <article className="product-card">
    <div className="product-image">
      <Link to={'/productos/' + product.slug} className="product-image-link" aria-label={'Ver ' + product.name}>
        <img className="product-image-primary" src={product.image} alt={product.name} style={{ objectPosition: product.position }} loading="lazy" />
        {secondaryImage && <img className="product-image-secondary" src={secondaryImage} alt="" style={{ objectPosition: product.position }} loading="lazy" aria-hidden="true" />}
      </Link>
      <a className="product-whatsapp" href={whatsappUrl(product.name)} target="_blank" rel="noreferrer">Consultanos por WhatsApp</a>
    </div>
    <div className="product-info"><div><h3><Link to={'/productos/' + product.slug}>{product.name}</Link></h3><p>{product.shortDescription}</p></div><strong>{money.format(product.price)}</strong></div>
  </article>
}

function Home() {
  const catalogProducts = useRemoteProducts()
  const homeCategories = useRemoteCategories()
  const homeContent = useRemoteContent()
  const featured = catalogProducts.filter((product) => product.featured).slice(0, 6)
  const introTitleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const element = introTitleRef.current
    if (!element || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => {
      element.classList.toggle('is-visible', entry.isIntersecting)
    }, { threshold: 0.18, rootMargin: '-8% 0px -8% 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <main>
    <section className="hero">{homeContent.heroMediaType === 'video' ? <video src={homeContent.heroMediaUrl} autoPlay muted loop playsInline aria-label="Video de fondo de Due Sorelas" /> : <img src={homeContent.heroMediaUrl} alt="Mujer usando bijouterie artesanal Due Sorelas" />}<div className="hero-copy"><p className="eyebrow">Bijouterie creada a mano</p><h1>Objetos pequeños,<br /><em>gestos que quedan.</em></h1><Link className="button button-light" to={categoryPath('collares')}>Explorar piezas <span>↗</span></Link></div><p className="hero-note">Hecho con intención<br />en Buenos Aires</p></section>
    <section className="intro section"><p className="eyebrow">Nuestra forma</p><h2 ref={introTitleRef} className="intro-reveal">Diseñamos piezas que se sienten propias desde el primer día.</h2><p>Collares, pulseras, dijes y pequeños adornos para combinar, regalar y llevar cerca.</p></section>
    <section className="about section" id="quienes-somos">
      <div className="about-heading"><p className="eyebrow">Quiénes somos</p><span>02 — Historia</span></div>
      <div className="about-layout">
        <div className="about-mark" aria-hidden="true">DUE<br /><em>Sorelas</em></div>
        <div className="about-copy">
          <p className="about-lead">Somos dos hermanas, <em>Myr y Eli</em>, cada una con su profesión y algo en común: nos gusta la moda y pensar detalles originales o especiales a la hora de elegir un obsequio.</p>
          <p>Con los años, surgió la idea de plasmar esa pasión en el diseño de accesorios. Inicialmente nació como un hobby, para gratificarnos y para agasajar a las personas de nuestro entorno. Luego, nos animamos a dar el paso.</p>
          <p>Y acá estamos, pensando todos los días en nuevas opciones y diseños. Lo que más nos entusiasma es que puedan participar: elegir colores y sugerir cambios por gusto o necesidad.</p>
          <p className="about-highlight">Personalizar los diseños es lo más lindo, porque significa hacer escuchando. Ese ida y vuelta es muy placentero.</p>
          <p className="about-signoff">Somos DUE SORELAS <small>(con licencia gramatical en <em>sorelle</em>)</small><br />Y si leíste hasta acá, muchas gracias. <span aria-label="corazón">♥</span></p>
        </div>
      </div>
    </section>
    <section className="categories section"><div className="section-heading"><p className="eyebrow">Explorá por rubro</p><span>01 — 05</span></div><div className="category-grid">{homeCategories.map((category, index) => <Link className={`category-card category-${index + 1}`} key={category.slug} to={categoryPath(category.slug)}><img src={category.image} alt="" style={{ objectPosition: category.position }} loading="lazy" /><div><span>0{index + 1}</span><h3>{category.name}</h3><p>{category.intro}</p><b>Descubrir <i>↗</i></b></div></Link>)}</div></section>
    <section className="craft-feature section"><div className="craft-copy"><p className="eyebrow">El detalle importa</p><h2>Hecho lento.<br /><em>Para usar mucho.</em></h2><p>Cada composición nace de combinar texturas, color y pequeños símbolos. La imperfección también es parte de la pieza.</p><a className="text-link" href={whatsappUrl('una pieza personalizada')} target="_blank" rel="noreferrer">Hacer una consulta <span>↗</span></a></div><div className="craft-video"><video autoPlay muted loop playsInline poster="/assets/catalogo-due-sorelas.png"><source src={homeContent.craftVideo} type="video/mp4" /></video></div></section>
    <section className="featured section"><div className="section-heading"><p className="eyebrow">Selección</p><Link className="text-link" to={categoryPath('collares')}>Ver todo <span>↗</span></Link></div><div className="product-grid">{featured.map((product) => <ProductCard product={product} key={product.slug} />)}</div></section>
  </main>
}

function CategoryPage() {
  const { slug } = useParams()
  const catalogProducts = useRemoteProducts()
  const catalogCategories = useRemoteCategories()
  const category = catalogCategories.find((item) => item.slug === slug)
  const categoryProducts = catalogProducts.filter((product) => product.category === slug)
  if (!category) return <NotFound />
  return <main className="catalog-page"><section className="catalog-heading"><p className="eyebrow">Due Sorelas / {category.name}</p><h1>{category.name}</h1><p>{category.intro}</p></section><nav className="category-pills" aria-label="Filtrar por categoría">{catalogCategories.map((item) => <Link className={item.slug === slug ? 'active' : ''} to={categoryPath(item.slug)} key={item.slug}>{item.name}</Link>)}</nav><div className="product-grid catalog-grid">{categoryProducts.map((product) => <ProductCard product={product} key={product.slug} />)}</div><section className="catalog-cta"><p className="eyebrow">¿Buscás algo especial?</p><h2>Consultanos por piezas personalizadas.</h2><a className="button" href={whatsappUrl('una pieza personalizada')} target="_blank" rel="noreferrer">Hablar por WhatsApp <span>↗</span></a></section></main>
}

function ProductPage() {
  const { slug } = useParams()
  const catalogProducts = useRemoteProducts()
  const product = catalogProducts.find((item) => item.slug === slug)
  const [openDetail, setOpenDetail] = useState(true)
  if (!product) return <NotFound />
  const relatedProducts = catalogProducts.filter((item) => item.category === product.category && item.slug !== product.slug).slice(0, 3)
  return <main className="product-page"><div className="breadcrumbs"><Link to="/">Inicio</Link><span>/</span><Link to={categoryPath(product.category)}>{categories.find((category) => category.slug === product.category)?.name}</Link><span>/</span><b>{product.name}</b></div><div className="product-layout"><section className="product-gallery">{product.gallery.map((image, index) => <figure key={`${image}-${index}`}><img src={image} alt={`${product.name}, vista ${index + 1}`} style={{ objectPosition: index === 0 ? product.position : undefined }} /><figcaption>0{index + 1}</figcaption></figure>)}</section><aside className="product-details"><p className="eyebrow">Due Sorelas / Pieza única</p><h1>{product.name}</h1><p className="price">{money.format(product.price)}</p>{product.priceNote && <p className="price-note">{product.priceNote}</p>}<p className="product-description">{product.description}</p><dl><div><dt>Materiales</dt><dd>{product.material}</dd></div><div><dt>Medidas</dt><dd>{product.dimensions}</dd></div></dl><a className="button full" href={whatsappUrl(product.name)} target="_blank" rel="noreferrer">Consultar por WhatsApp <span>↗</span></a><div className="accordion"><button onClick={() => setOpenDetail(!openDetail)} aria-expanded={openDetail}>Cuidados de la pieza <span>{openDetail ? '−' : '+'}</span></button>{openDetail && <p>Para preservar el brillo, evitá el contacto directo con agua, perfume o cremas. Guardala en un lugar seco cuando no la uses.</p>}</div><p className="one-of-one">Cada pieza se termina a mano; las pequeñas variaciones hacen única a la tuya.</p></aside></div><section className="related section"><div className="section-heading"><p className="eyebrow">También puede gustarte</p><Link className="text-link" to={categoryPath(product.category)}>Ver {categories.find((category) => category.slug === product.category)?.name.toLowerCase()} <span>↗</span></Link></div><div className="product-grid">{relatedProducts.map((item) => <ProductCard product={item} key={item.slug} />)}</div></section></main>
}

function NotFound() { return <main className="not-found"><p className="eyebrow">404</p><h1>Esta pieza no está por acá.</h1><Link className="button" to="/">Volver al inicio <span>↗</span></Link></main> }

function Footer() { return <footer className="site-footer"><Link className="brand" to="/">DUE <em>Sorelas</em></Link><p>Bijouterie creada a mano.<br />Buenos Aires, Argentina.</p><a href={whatsappUrl('una pieza')} target="_blank" rel="noreferrer">WhatsApp ↗</a><small>Demo con recursos visuales generados y video de Pexels. Antes de publicar, reemplazar por imágenes y video propios/Cloudinary.</small></footer> }

export default function App() { return <><SmoothScroll /><ScrollToTop /><Header /><Routes><Route path="/" element={<Home />} /><Route path="/categorias/:slug" element={<CategoryPage />} /><Route path="/productos/:slug" element={<ProductPage />} /><Route path="/admin" element={<Admin />} /><Route path="*" element={<NotFound />} /></Routes><Footer /></> }
