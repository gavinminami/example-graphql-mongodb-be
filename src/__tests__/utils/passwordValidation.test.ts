import { validatePasswordComplexity } from "../../utils/passwordValidation";

describe("validatePasswordComplexity", () => {
  it("should accept a valid password", () => {
    const password = "Test123!@#";
    const result = validatePasswordComplexity(password);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject password shorter than 8 characters", () => {
    const password = "Test1!";
    const result = validatePasswordComplexity(password);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must be at least 8 characters long"
    );
  });

  it("should reject password without uppercase letters", () => {
    const password = "test123!@#";
    const result = validatePasswordComplexity(password);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one uppercase letter"
    );
  });

  it("should reject password without lowercase letters", () => {
    const password = "TEST123!@#";
    const result = validatePasswordComplexity(password);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one lowercase letter"
    );
  });

  it("should reject password without numbers", () => {
    const password = "TestTest!@#";
    const result = validatePasswordComplexity(password);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one number"
    );
  });

  it("should reject password without special characters", () => {
    const password = "Test123Test";
    const result = validatePasswordComplexity(password);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one special character"
    );
  });

  it("should return multiple errors for invalid password", () => {
    const password = "test";
    const result = validatePasswordComplexity(password);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must be at least 8 characters long"
    );
    expect(result.errors).toContain(
      "Password must contain at least one uppercase letter"
    );
    expect(result.errors).toContain(
      "Password must contain at least one number"
    );
    expect(result.errors).toContain(
      "Password must contain at least one special character"
    );
  });
});
