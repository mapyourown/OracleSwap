import {A, C, D} from '../basics/Colors'
import {Box, Flex} from '@rebass/grid'
import React, {useState} from 'react'
import Text from '../basics/Text'
import Triangle from '../basics/Triangle'
import Styled from 'styled-components'

const Field = Styled(Box)`
    cursor: pointer;
    user-select: none;
`

export default ({order: [by, asc], setOrder}) =>
        <Flex
        pb="10px"
        style={{
            borderBottom: `thin solid ${D}`
        }}>
            <Box width="calc(100% - 700px)" alignItems="flex-end" pt="20px">
                <Text size="14px">Liquidity Provider</Text>
            </Box>
            <Box width="250px">
                <Box mb="7px">
                    <Text>Taker Margin Rates</Text>
                    <br/>
                    <Text>(% per week)</Text>
                </Box>
                <Flex width="130px">
                    <Field width={1/2} onClick={() => setOrder(1, !asc)}><Text size="14px">Long {by == 1 ? <Triangle rotation={!asc ? "180deg" : ""} scale="0.8" fill color="white"/> : null}</Text></Field>
                    <Field width={1/2} onClick={() => setOrder(2, !asc)}><Text size="14px">Short</Text> {by == 2 ? <Triangle rotation={!asc ? "180deg" : ""} scale="0.8" fill color="white"/> : null}</Field>
                </Flex>
            </Box>
            <Box width="350px">
                <Box mb="7px"><Text>Current Balance</Text><br/></Box>                
                <Flex>
                    <Field width={1/4} onClick={() => setOrder(3, !asc)}><Text size="14px">Long</Text> {by == 3 ? <Triangle rotation={!asc ? "180deg" : ""} scale="0.8" fill color="white"/> : null}</Field>
                    <Field width={1/4} onClick={() => setOrder(4, !asc)}><Text size="14px">Short</Text> {by == 4 ? <Triangle rotation={!asc ? "180deg" : ""} scale="0.8" fill color="white"/> : null}</Field>
                    <Field width={1/4} onClick={() => setOrder(5, !asc)}><Text size="11px">Required</Text><br/><Text size="11px">Margin</Text> {by == 5 ? <Triangle rotation={!asc ? "180deg" : ""} scale="0.8" fill color="white"/> : null}</Field>
                    <Field width={1/4} onClick={() => setOrder(6, !asc)}><Text size="11px">Actual</Text><br/><Text size="11px">Margin</Text> {by == 6 ? <Triangle rotation={!asc ? "180deg" : ""} scale="0.8" fill color="white"/> : null}</Field>
                </Flex>
            </Box>
        </Flex>