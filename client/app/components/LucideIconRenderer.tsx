import * as icons from "lucide-react";
import { type LucideProps, HelpCircle } from "lucide-react";

interface Props extends LucideProps {
  name: string;
}

export const LucideIconRenderer = ({ name, ...props }: Props) => {
  // Check if it is a URL or a Base64 image
  const isUrl = name.startsWith("http") || 
                name.startsWith("/") || 
                name.startsWith("data:image/") ||
                /\.(png|jpg|jpeg|svg|webp|gif|avif)$/.test(name.toLowerCase());

  if (isUrl) {
    const size = props.size || props.width || 20;
    return (
      <div className={`flex items-center justify-center ${props.className}`} style={{ width: size, height: size }}>
        <img
          src={name}
          alt="icon"
          style={{ 
            maxWidth: "100%", 
            maxHeight: "100%", 
            objectFit: "contain" 
          }}
        />
      </div>
    );
  }

  // Convert icon name to PascalCase if it isn't (e.g. youtube -> Youtube)
  const formatIconName = (str: string) => {
    return str
      .split(/[-_ ]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join("");
  };

  const pascalName = formatIconName(name);
  const Icon = (icons as any)[pascalName] || HelpCircle;

  return <Icon {...props} />;
};
