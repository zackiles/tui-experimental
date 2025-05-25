// Constraint solver wrapper using Kiwi (Cassowary implementation)

import * as kiwi from '@lume/kiwi'
import type { Constraint, ConstraintSolver } from '../core/types.ts'
import { ConstraintStrength } from '../core/types.ts'

export class KiwiConstraintSolver implements ConstraintSolver {
  private solver: kiwi.Solver
  private variables = new Map<string, kiwi.Variable>()
  private constraints = new Map<string, kiwi.Constraint>()
  private constraintCounter = 0

  constructor() {
    this.solver = new kiwi.Solver()
  }

  addVariable(name: string): kiwi.Variable {
    const existing = this.variables.get(name)
    if (existing) {
      return existing
    }

    const variable = new kiwi.Variable(name)
    this.variables.set(name, variable)
    return variable
  }

  addConstraint(constraint: Constraint): string {
    const constraintId = `constraint_${++this.constraintCounter}`
    
    try {
      const kiwiConstraint = this.parseConstraintExpression(
        constraint.expression,
        this.getKiwiStrength(constraint.strength || ConstraintStrength.Required)
      )
      
      this.solver.addConstraint(kiwiConstraint)
      this.constraints.set(constraintId, kiwiConstraint)
      
      return constraintId
    } catch (error) {
      throw new Error(`Failed to add constraint: ${constraint.expression}. ${error}`)
    }
  }

  solve(): Map<string, number> {
    try {
      this.solver.updateVariables()
    } catch (error) {
      throw new Error(`Constraint solving failed: ${error}`)
    }

    const results = new Map<string, number>()
    this.variables.forEach((variable, name) => {
      results.set(name, variable.value())
    })
    return results
  }

  updateVariable(name: string, value: number): void {
    const variable = this.variables.get(name)
    if (!variable) {
      throw new Error(`Variable '${name}' not found`)
    }

    // Create a suggestion for the variable value
    try {
      this.solver.addEditVariable(variable, kiwi.Strength.strong)
      this.solver.suggestValue(variable, value)
    } catch (error) {
      throw new Error(`Failed to update variable '${name}': ${error}`)
    }
  }

  removeConstraint(constraintId: string): void {
    const constraint = this.constraints.get(constraintId)
    if (!constraint) {
      throw new Error(`Constraint '${constraintId}' not found`)
    }

    try {
      this.solver.removeConstraint(constraint)
      this.constraints.delete(constraintId)
    } catch (error) {
      throw new Error(`Failed to remove constraint '${constraintId}': ${error}`)
    }
  }

  private parseConstraintExpression(expression: string, strength: number): kiwi.Constraint {
    // Parse constraint expressions like:
    // "width >= 100"
    // "left + width == right"  
    // "column1.width == column2.width"
    // "footer.bottom == screen.height - 10"

    const sanitized = expression.trim()
    
    // Find the operator
    let operator: '==' | '<=' | '>=' | '='
    let operatorIndex = -1
    
    if (sanitized.includes('==')) {
      operator = '=='
      operatorIndex = sanitized.indexOf('==')
    } else if (sanitized.includes('<=')) {
      operator = '<='
      operatorIndex = sanitized.indexOf('<=')
    } else if (sanitized.includes('>=')) {
      operator = '>='
      operatorIndex = sanitized.indexOf('>=')
    } else if (sanitized.includes('=')) {
      operator = '='
      operatorIndex = sanitized.indexOf('=')
    } else {
      throw new Error(`No valid operator found in constraint: ${expression}`)
    }

    const leftSide = sanitized.substring(0, operatorIndex).trim()
    const rightSide = sanitized.substring(operatorIndex + operator.length).trim()

    // Parse left and right expressions
    const leftExpr = this.parseExpression(leftSide)
    const rightExpr = this.parseExpression(rightSide)

    // Create the constraint based on operator
    switch (operator) {
      case '=':
      case '==':
        return new kiwi.Constraint(leftExpr, kiwi.Operator.Eq, rightExpr, strength)
      case '<=':
        return new kiwi.Constraint(leftExpr, kiwi.Operator.Le, rightExpr, strength)
      case '>=':
        return new kiwi.Constraint(leftExpr, kiwi.Operator.Ge, rightExpr, strength)
      default:
        throw new Error(`Unsupported operator: ${operator}`)
    }
  }

  private parseExpression(expr: string): kiwi.Expression {
    // Parse expressions like:
    // "width"
    // "left + width"
    // "screen.height - 10"
    // "column1.width * 2"

    const trimmedExpr = expr.trim()
    
    // Handle simple numbers
    if (/^\d+(\.\d+)?$/.test(trimmedExpr)) {
      return new kiwi.Expression(Number.parseFloat(trimmedExpr))
    }

    // Handle simple variable references
    if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(trimmedExpr)) {
      const variable = this.addVariable(trimmedExpr)
      return new kiwi.Expression(variable)
    }

    // Handle basic arithmetic operations
    // This is a simplified parser - could be enhanced with a proper expression parser
    if (trimmedExpr.includes('+')) {
      const parts = trimmedExpr.split('+').map(p => p.trim())
      let result = this.parseExpression(parts[0])
      for (let i = 1; i < parts.length; i++) {
        result = result.plus(this.parseExpression(parts[i]))
      }
      return result
    }

    if (trimmedExpr.includes('-')) {
      const parts = trimmedExpr.split('-').map(p => p.trim())
      let result = this.parseExpression(parts[0])
      for (let i = 1; i < parts.length; i++) {
        result = result.minus(this.parseExpression(parts[i]))
      }
      return result
    }

    if (trimmedExpr.includes('*')) {
      const parts = trimmedExpr.split('*').map(p => p.trim())
      let result = this.parseExpression(parts[0])
      for (let i = 1; i < parts.length; i++) {
        const multiplier = Number.parseFloat(parts[i])
        if (!Number.isNaN(multiplier)) {
          result = result.multiply(multiplier)
        } else {
          throw new Error(`Multiplication by non-number not supported: ${parts[i]}`)
        }
      }
      return result
    }

    if (trimmedExpr.includes('/')) {
      const parts = trimmedExpr.split('/').map(p => p.trim())
      let result = this.parseExpression(parts[0])
      for (let i = 1; i < parts.length; i++) {
        const divisor = Number.parseFloat(parts[i])
        if (!Number.isNaN(divisor) && divisor !== 0) {
          result = result.divide(divisor)
        } else {
          throw new Error(`Invalid division: ${parts[i]}`)
        }
      }
      return result
    }

    // Fallback: treat as variable name
    const variable = this.addVariable(trimmedExpr)
    return new kiwi.Expression(variable)
  }

  private getKiwiStrength(strength: ConstraintStrength): number {
    switch (strength) {
      case ConstraintStrength.Required:
        return kiwi.Strength.required
      case ConstraintStrength.Strong:
        return kiwi.Strength.strong
      case ConstraintStrength.Medium:
        return kiwi.Strength.medium
      case ConstraintStrength.Weak:
        return kiwi.Strength.weak
      default:
        return kiwi.Strength.required
    }
  }

  // Utility methods for advanced constraint creation
  createEqualConstraint(var1: string, var2: string, strength = ConstraintStrength.Required): string {
    return this.addConstraint({
      expression: `${var1} == ${var2}`,
      strength,
    })
  }

  createMinConstraint(variable: string, minValue: number, strength = ConstraintStrength.Required): string {
    return this.addConstraint({
      expression: `${variable} >= ${minValue}`,
      strength,
    })
  }

  createMaxConstraint(variable: string, maxValue: number, strength = ConstraintStrength.Required): string {
    return this.addConstraint({
      expression: `${variable} <= ${maxValue}`,
      strength,
    })
  }

  createRatioConstraint(
    var1: string, 
    var2: string, 
    ratio: number, 
    strength = ConstraintStrength.Required
  ): string {
    return this.addConstraint({
      expression: `${var1} == ${var2} * ${ratio}`,
      strength,
    })
  }

  // Debug helper
  getConstraintInfo(): { variables: string[], constraints: string[] } {
    return {
      variables: Array.from(this.variables.keys()),
      constraints: Array.from(this.constraints.keys()),
    }
  }
} 