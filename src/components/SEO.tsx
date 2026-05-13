import { Helmet } from "react-helmet-async";

const SITE_URL = "https://app.obrasys.pt";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

export const SEO = ({ title, description, path, noindex }: SEOProps) => {
  const url = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
};
