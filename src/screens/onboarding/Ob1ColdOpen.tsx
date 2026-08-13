import { useStore } from '../../state/store';
import { PrimaryButton } from '../../components/ui';

/** 1 · Cold open. No input. The poster, not a form. */
export function Ob1ColdOpen() {
  const { next } = useStore();
  return (
    <div className="absolute inset-0 box-border flex flex-col px-5 pb-10 pt-24" style={{ zIndex: 1 }}>
      <div style={{ flex: 1.15 }} />
      <div className="display pretty max-w-[330px]">
        Most people don’t know what’s actually in their stack.
      </div>
      <div className="flex-1" />
      <PrimaryButton onClick={next}>Find out</PrimaryButton>
    </div>
  );
}
