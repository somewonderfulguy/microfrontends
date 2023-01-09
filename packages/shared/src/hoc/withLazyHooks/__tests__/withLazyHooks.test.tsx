import React from 'react'
import { FallbackProps } from 'react-error-boundary'

import { render, screen, userEvent, waitForElementToBeRemoved, mockConsole, checkConsoleLogging, clearConsoleMocks } from '../../../tests'

import { withLazyHooks } from '..'
import {
  TestComponentSingleHook as TestComponentSingleHookImpl, TestComponentMultipleHooks as TestComponentMultipleHooksImpl, errorMsg
} from './TestComponents'
import { hookOneResult } from './testHooks/useTestHookOne'
import { hookTwoResult } from './testHooks/useTestHookTwo'

const testErrorCase = async (isCustomError = false) => {
  // mock console methods
  const { consoleDir, consoleError, consoleLog } = mockConsole()

  const TestComponentSingleHook = withLazyHooks({
    hooks: { useTestHookOne: import('./testHooks/useTestHookOne') },
    Component: TestComponentSingleHookImpl,
    Fallback: isCustomError
      ? ({ error, resetErrorBoundary }: FallbackProps) => (
        <div>
          <div role="alert">{error.message}</div>
          <button onClick={resetErrorBoundary}>reset</button>
        </div>
      )
      : undefined
  })

  const { container, rerender } = render(<TestComponentSingleHook withError />)
  const loader = container.querySelector('[aria-busy="true"]')
  const getErrorElement = () => screen.getByText(errorMsg)

  // loader exist
  expect(loader).toBeInTheDocument()
  // error message doesn't exist yet
  expect(screen.queryByText(errorMsg)).not.toBeInTheDocument()
  // loader disappeared
  await waitForElementToBeRemoved(loader)
  // error message appeared
  expect(getErrorElement()).toBeInTheDocument()
  // reset by click
  userEvent.click(screen.getByText(/reset/i, { selector: 'button' }))
  rerender(<TestComponentSingleHook />)
  // error message disappears
  await waitForElementToBeRemoved(getErrorElement)
  // loader returns
  const newLoader = container.querySelector('[aria-busy="true"]')
  expect(newLoader).toBeInTheDocument()
  // loader disappeared
  await waitForElementToBeRemoved(newLoader)
  // component successfully re-rendered without errors
  expect(screen.getByText(hookOneResult)).toBeInTheDocument()

  // check console logging
  checkConsoleLogging({ consoleError, consoleDir, consoleLog, errorMsg, componentName: 'TestComponentSingleHook' })

  // restore console methods
  clearConsoleMocks({ consoleError, consoleDir, consoleLog })
}

test('minimal configuration', async () => {
  const TestComponentSingleHook = withLazyHooks({
    hooks: { useTestHookOne: import('./testHooks/useTestHookOne') },
    Component: TestComponentSingleHookImpl
  })

  const { container } = render(<TestComponentSingleHook />)
  const loader = container.querySelector('[aria-busy="true"]')

  // loader exist
  expect(loader).toBeInTheDocument()
  // component doesn't exist yet
  expect(screen.queryByText(hookOneResult)).not.toBeInTheDocument()
  // loader disappeared
  await waitForElementToBeRemoved(loader)
  // component appeared
  expect(screen.getByText(hookOneResult)).toBeInTheDocument()
})

test('custom loader', async () => {
  const loadingMsg = 'Loading...'
  const TestComponentSingleHook = withLazyHooks({
    hooks: { useTestHookOne: import('./testHooks/useTestHookOne') },
    Component: TestComponentSingleHookImpl,
    delayedElement: <>{loadingMsg}</>
  })
  render(<TestComponentSingleHook />)
  const getLoader = () => screen.getByText(loadingMsg)

  // loader exist
  expect(getLoader()).toBeInTheDocument()
  // component doesn't exist yet
  expect(screen.queryByText(hookOneResult)).not.toBeInTheDocument()
  // loader disappeared
  await waitForElementToBeRemoved(getLoader)
  // component appeared
  expect(screen.getByText(hookOneResult)).toBeInTheDocument()
})

test('multiple hooks', async () => {
  const TestComponentSingleHook = withLazyHooks({
    hooks: {
      useTestHookOne: import('./testHooks/useTestHookOne'),
      useTestHookTwo: import('./testHooks/useTestHookTwo')
    },
    Component: TestComponentMultipleHooksImpl
  })

  const { container } = render(<TestComponentSingleHook />)
  const loader = container.querySelector('[aria-busy="true"]')

  // loader exist
  expect(loader).toBeInTheDocument()
  // component doesn't exist yet
  expect(screen.queryByText(hookOneResult)).not.toBeInTheDocument()
  expect(screen.queryByText(hookTwoResult)).not.toBeInTheDocument()
  // loader disappeared
  await waitForElementToBeRemoved(loader)
  // component appeared
  expect(screen.getByText(hookOneResult)).toBeInTheDocument()
  expect(screen.getByText(hookTwoResult)).toBeInTheDocument()
})

// eslint-disable-next-line jest/expect-expect
test('error in hook & reset', async () => {
  await testErrorCase()
})

// eslint-disable-next-line jest/expect-expect
test('custom error fallback (for hook crushed) & reset', async () => {
  await testErrorCase(true)
})

test('error in loader (promise) & reset', async () => {
  // mock console methods
  const { consoleDir, consoleError, consoleLog } = mockConsole()

  const getTestComponentSingleHook = (withLoadingError = false) => withLazyHooks({
    hooks: { useTestHookOne: withLoadingError ? Promise.reject(errorMsg) : import('./testHooks/useTestHookOne') },
    Component: TestComponentSingleHookImpl
  })
  const TestComponentSingleHook = getTestComponentSingleHook(true)

  const { container, rerender } = render(<TestComponentSingleHook />)
  const loader = container.querySelector('[aria-busy="true"]')
  const getErrorElement = () => screen.getByText(errorMsg)

  // loader exist
  expect(loader).toBeInTheDocument()
  // component doesn't exist yet
  expect(screen.queryByText(hookOneResult)).not.toBeInTheDocument()
  // loader disappeared
  await waitForElementToBeRemoved(loader)
  // error message appeared
  expect(getErrorElement()).toBeInTheDocument()
  // reset by click
  userEvent.click(screen.getByText(/reset/i, { selector: 'button' }))
  const TestComponentSingleHookCorrect = getTestComponentSingleHook()
  rerender(<TestComponentSingleHookCorrect />)
  // error message disappears
  expect(screen.queryByText(errorMsg)).not.toBeInTheDocument()
  // loader returns
  const newLoader = container.querySelector('[aria-busy="true"]')
  expect(newLoader).toBeInTheDocument()
  // loader disappeared
  await waitForElementToBeRemoved(newLoader)
  // component successfully re-rendered without errors
  expect(screen.getByText(hookOneResult)).toBeInTheDocument()

  // check console logging
  // checkConsoleLogging({ consoleError, consoleDir, consoleLog, errorMsg, componentName: 'TestComponentSingleHook' })

  // restore console methods
  // clearConsoleMocks({ consoleError, consoleDir, consoleLog })
})

test.todo('custom error fallback (for loader) & reset')

test.todo('custom query key with accessing query client')