export type LoginSearchParams = {
  error?: string | string[];
  next?: string | string[];
};

export type LoginPageProps = {
  searchParams?: Promise<LoginSearchParams>;
};

export type LoginButtonProps = {
  redirectPath?: string;
};
