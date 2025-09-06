// import Image from 'next/image';
import { cn } from '#@/lib/utils/utils.ts';
import Image from 'next/image';
import Link from 'next/link';
interface LogoProps {
  className?: string;
  linkToHome?: boolean;
  withName?: boolean;
  width?: number;
  height?: number;
  size?: "small" | "medium" | "large";
}

const Logo = ({
  className, 
  width = 128, 
  height = 23, 
  size = "medium", 
  linkToHome = true,
  withName = true
}: LogoProps) => {
  const sizeClasses = {
    small: "h-6",
    medium: "h-8",
    large: "h-10",
  };
  const logoElement = (
    <div className={cn("relative h-2/5 w-max flex items-center", className)}>
      <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg transform scale-110 opacity-70"></div>
      <div className={cn("relative flex items-center", sizeClasses[size])}>
        <div className='w-32 h-auto place-items-center'>
          <Image priority
            src="/logo2.svg"
            alt="As-Salam" width={width} height={height} placeholder="blur"
            blurDataURL={`${process.env.NEXT_PUBLIC_APP_URL}/logo2.svg`}
            style={{ width:width, height:height }}
            className="self-center aspect-auto transition-transform duration-300 transform drop-shadow-lg hover:scale-105"
          />
        </div>
        {withName && (
          <>
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70 tracking-tight mr-1">
          As Salam JS
          </span>
          <span className="font-light text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70 tracking-tight">
            Online 
          </span>
          </>
        )}
      </div>
    </div>
  )
  return linkToHome ? (
    <Link href="/" className='self-center'>{logoElement}
    </Link>
  ) : (
    logoElement
  );
};
export default Logo;