import React from "react"
import { Form, Input } from "antd"

type PasswordFieldsProps = {
  name?: string
  confirmName?: string
  label?: string
  confirmLabel?: string
}

const PasswordFields: React.FC<PasswordFieldsProps> = ({
  name = "password",
  confirmName = "confirmPassword",
  label = "รหัสผ่านใหม่",
  confirmLabel = "ยืนยันรหัสผ่านใหม่",
}) => {
  return (
    <>
      <Form.Item
        name={name}
        label={label}
        rules={[
          { required: true, message: "กรุณากรอกรหัสผ่านใหม่" },
          { min: 8, message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" },
          {
            pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
            message: "รหัสผ่านต้องมีทั้งตัวอักษร ตัวเลข และอักขระพิเศษอย่างน้อย 1 ตัว",
          },
        ]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        name={confirmName}
        label={confirmLabel}
        dependencies={[name]}
        rules={[
          { required: true, message: "กรุณายืนยันรหัสผ่านใหม่" },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue(name) === value) {
                return Promise.resolve()
              }
              return Promise.reject(new Error("รหัสผ่านไม่ตรงกัน"))
            },
          }),
        ]}
      >
        <Input.Password />
      </Form.Item>
    </>
  )
}

export default PasswordFields