import { useState } from 'react';
import { Package } from 'lucide-react';

export default function ProductImage({ product, alt = '', className = '', style = {}, placeholderSize = 48 }) {
  const source = product?.image_url || product?.image;
  const [failedSource, setFailedSource] = useState('');

  if (!source || failedSource === source) {
    return <Package size={placeholderSize} className="text-muted" />;
  }

  return (
    <img
      src={source}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailedSource(source)}
    />
  );
}
