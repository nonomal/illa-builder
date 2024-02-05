import { SubmitHandler } from "react-hook-form"
import { PasswordSettingFields } from "@/page/setting/interface"

export interface PasswordSettingProps {
  loading: boolean
  onSubmit: SubmitHandler<PasswordSettingFields>
  validPasswordReport?: () => void
}
